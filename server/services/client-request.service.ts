import { EnumRol } from "@/shared/schema/user.schema.js";
import { storage } from "../storage/storeage/database-storage.js";
import type { ClientRequest, ClientRequestWithSender } from "@/shared/schema";

/** Returns a Date that is `days` business days (Mon–Fri) after `from` */
function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay(); // 0=Sun 6=Sat
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

async function checkIsAlreadyClient(fromUserId: string, toUserId: string, role: string): Promise<boolean> {
  const client = await storage.clientes.getClienteByUser(toUserId);
  if (!client) return false;

  if (role === EnumRol.ABOGADO.nombre) {
    const lawyer = await storage.abogados.getLawyerByUserId(fromUserId);
    if (!lawyer) return false;
    const rel = await storage.lawyerClients.getActiveLawyerClient(lawyer.id, client.id);
    return !!rel;
  }
  if (role === EnumRol.BUFETE.nombre) {
    const firm = await storage.firmProfiles.getFirmProfileByUserId(fromUserId);
    if (!firm) return false;
    const rel = await storage.firmClients.getActiveFirmClient(firm.id, client.id);
    return !!rel;
  }
  return false;
}

async function getSenderDisplayName(userId: string, role: string): Promise<string> {
  if (role === EnumRol.ABOGADO.nombre) {
    const lawyer = await storage.abogados.getLawyerByUserId(userId);
    if (lawyer) return `${lawyer.persona?.nombre} ${lawyer.persona?.apellido}`.trim();
  }
  if (role === EnumRol.BUFETE.nombre) {
    const firm = await storage.firmProfiles.getFirmProfileByUserId(userId);
    if (firm) return firm.name;
  }
  const user = await storage.users.getUserById(userId);
  return user?.name ?? "Usuario";
}

export const clientRequestService = {

  async sendRequest(fromUserId: string, toUserId: string) {
    const fromUser = await storage.users.getUserById(fromUserId);
    if (!fromUser || (fromUser.rol.nombre !== EnumRol.ABOGADO.nombre && fromUser.rol !== EnumRol.BUFETE.nombre)) {
      throw Object.assign(new Error("Solo abogados y bufetes pueden enviar solicitudes"), { status: 403 });
    }

    const toUser = await storage.users.getUserById(toUserId);
    if (!toUser || toUser.rol.nombre !== EnumRol.CLIENTE.nombre) {
      throw Object.assign(new Error("Solo puedes enviar solicitudes a clientes"), { status: 400 });
    }

    // Expire stale pending requests first
    await storage.clientRequests.expirePendingRequests();

    const isClient = await checkIsAlreadyClient(fromUserId, toUserId, fromUser.rol.nombre);
    if (isClient) {
      throw Object.assign(new Error("Este usuario ya es tu cliente"), { status: 409 });
    }

    const pending = await storage.clientRequests.getPendingRequest(fromUserId, toUserId);
    if (pending) {
      throw Object.assign(new Error("Ya tienes una solicitud pendiente con este cliente"), { status: 409 });
    }

    const expiresAt = addBusinessDays(new Date(), 3);
    const req = await storage.clientRequests.createRequest(fromUserId, toUserId, expiresAt);

    const senderName = await getSenderDisplayName(fromUserId, fromUser.rol.nombre);
    const roleLabel  = fromUser.rol.nombre === EnumRol.ABOGADO.nombre ? EnumRol.ABOGADO.nombre : EnumRol.BUFETE.nombre;

    await storage.appNotifications.createNotification(
      toUserId,
      "client_request",
      "Solicitud de cliente",
      `${roleLabel} ${senderName} quiere agregarте como su cliente. ¿Deseas aceptar?`,
      { requestId: req.id, fromUserId, fromName: senderName, fromRole: fromUser.rol.nombre },
    );

    return req;
  },

  async getStatus(fromUserId: string, toUserId: string) {
    const fromUser = await storage.users.getUserById(fromUserId);
    if (!fromUser) throw Object.assign(new Error("Usuario no encontrado"), { status: 404 });

    await storage.clientRequests.expirePendingRequests();

    const isClient = await checkIsAlreadyClient(fromUserId, toUserId, fromUser.rol.nombre);
    if (isClient) return { isClient: true, canSend: false, request: null };

    const latest = await storage.clientRequests.getLatestRequest(fromUserId, toUserId);
    if (!latest) return { isClient: false, canSend: true, request: null };

    if (latest.status === "accepted") return { isClient: true,  canSend: false, request: latest };
    if (latest.status === "pending")  return { isClient: false, canSend: false, request: latest };
    // rejected or expired → can send again
    return { isClient: false, canSend: true, request: latest };
  },

  async getPendingForClient(toUserId: string): Promise<ClientRequestWithSender[]> {
    await storage.clientRequests.expirePendingRequests();
    return storage.clientRequests.getPendingRequestsForUser(toUserId);
  },

  async respondToRequest(requestId: string, clientUserId: string, accept: boolean) {
    const req = await storage.clientRequests.getRequestById(requestId);
    if (!req || req.toUserId !== clientUserId) {
      throw Object.assign(new Error("Solicitud no encontrada"), { status: 404 });
    }
    if (req.status !== "pending") {
      throw Object.assign(new Error("Esta solicitud ya fue respondida"), { status: 409 });
    }
    if (new Date() > new Date(req.expiresAt)) {
      await storage.clientRequests.respondToRequest(requestId, "expired");
      throw Object.assign(new Error("La solicitud ha expirado"), { status: 410 });
    }

    const newStatus = accept ? "accepted" : "rejected";
    await storage.clientRequests.respondToRequest(requestId, newStatus);

    if (accept) {
      const fromUser = await storage.users.getUserById(req.fromUserId);
      const client   = await storage.clientes.getClienteByUser(clientUserId);

      if (fromUser && client) {
        if (fromUser.rol.nombre === EnumRol.ABOGADO.nombre) {
          const lawyer = await storage.abogados.getLawyerByUserId(req.fromUserId);
          if (lawyer) {
            const exists = await storage.lawyerClients.getActiveLawyerClient(lawyer.id, client.id);
            if (!exists) {
              const { randomUUID } = await import("crypto");
              await storage.lawyerClients.createLawyerClient({
                id: randomUUID(),
                lawyerId: lawyer.id,
                clientId: client.id,
                createdBy: req.fromUserId,
              });
            }
          }
        } else if (fromUser.rol.nombre === EnumRol.BUFETE.nombre) {
          const firm = await storage.firmProfiles.getFirmProfileByUserId(req.fromUserId);
          if (firm) {
            const exists = await storage.firmClients.getActiveFirmClient(firm.id, client.id);
            if (!exists) {
              await storage.firmClients.createFirmClient(firm.id, client.id);
            }
          }
        }
      }
    }

    // Notify the sender
    const clientUser = await storage.users.getUserById(clientUserId);
    const clientName = clientUser?.name ?? "El cliente";

    await storage.appNotifications.createNotification(
      req.fromUserId,
      accept ? "request_accepted" : "request_rejected",
      accept ? "Solicitud aceptada" : "Solicitud rechazada",
      accept
        ? `${clientName} aceptó tu solicitud y ahora es tu cliente.`
        : `${clientName} rechazó tu solicitud de cliente.`,
      { clientUserId, clientName },
    );

    return { status: newStatus };
  },
};
