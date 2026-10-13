export interface MessagingChannels {
  /** Correo desde la plataforma: requiere la clave de Resend en el servidor. */
  readonly email: boolean
}

export function getMessagingChannels(): MessagingChannels {
  return { email: Boolean(process.env.RESEND_API_KEY) }
}
