import twilio from 'twilio'

// Lazy initialization to prevent build-time errors
let twilioClient: ReturnType<typeof twilio> | null = null

function getTwilioClient() {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN

    if (!accountSid || !authToken) {
      throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables are required')
    }

    twilioClient = twilio(accountSid, authToken)
  }
  return twilioClient
}

function getWhatsAppFrom(): string {
  const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM
  if (!whatsappFrom) {
    throw new Error('TWILIO_WHATSAPP_FROM environment variable is required')
  }
  return whatsappFrom
}

export type SendWhatsAppParams = {
  to: string // Phone number with country code, e.g., "+521234567890"
  message: string
  mediaUrl?: string // Optional PDF URL
}

export type WhatsAppResult = {
  success: boolean
  messageId?: string
  status?: string
  error?: string
}

export async function sendWhatsAppMessage({
  to,
  message,
  mediaUrl,
}: SendWhatsAppParams): Promise<WhatsAppResult> {
  try {
    const client = getTwilioClient()
    const whatsappFrom = getWhatsAppFrom()

    // Format phone number for WhatsApp
    const whatsappTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`

    const messageParams: {
      from: string
      to: string
      body: string
      mediaUrl?: string[]
    } = {
      from: whatsappFrom,
      to: whatsappTo,
      body: message,
    }

    if (mediaUrl) {
      messageParams.mediaUrl = [mediaUrl]
    }

    const result = await client.messages.create(messageParams)

    return {
      success: true,
      messageId: result.sid,
      status: result.status,
    }
  } catch (error: any) {
    console.error('WhatsApp send error:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

export async function getMessageStatus(messageSid: string) {
  try {
    const client = getTwilioClient()
    const message = await client.messages(messageSid).fetch()
    return {
      status: message.status,
      errorCode: message.errorCode,
      errorMessage: message.errorMessage,
    }
  } catch (error: any) {
    console.error('Error fetching message status:', error)
    return {
      status: 'unknown',
      error: error.message,
    }
  }
}
