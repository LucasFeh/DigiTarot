/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string
  readonly VITE_FIREBASE_APP_ID?: string
  /** Chave pública reCAPTCHA Enterprise registrada no App Check. */
  readonly VITE_FIREBASE_APPCHECK_SITE_KEY?: string
  /** Chave Pix do recebedor: CPF, CNPJ, telefone, e-mail ou chave aleatória. */
  readonly VITE_PIX_CHAVE?: string
  /** Nome do recebedor como aparece no app do pagador. Até 25 caracteres. */
  readonly VITE_PIX_NOME?: string
  /** Cidade do recebedor. Até 15 caracteres. */
  readonly VITE_PIX_CIDADE?: string
  /** WhatsApp para o envio do comprovante, só dígitos com DDI. */
  readonly VITE_WHATSAPP?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
