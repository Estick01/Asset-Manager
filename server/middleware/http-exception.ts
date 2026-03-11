/**
 * HttpException — typed HTTP error that the global error handler
 * in server/index.ts already knows how to handle via `err.status`.
 */
export class HttpException extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpException";
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static badRequest(message: string) {
    return new HttpException(400, message);
  }

  static unauthorized(message: string = "No autenticado") {
    return new HttpException(401, message);
  }

  static forbidden(message: string = "Sin permisos para esta acción") {
    return new HttpException(403, message);
  }

  static notFound(message: string = "Recurso no encontrado") {
    return new HttpException(404, message);
  }

  static conflict(message: string) {
    return new HttpException(409, message);
  }

  static unprocessable(message: string) {
    return new HttpException(422, message);
  }
}
