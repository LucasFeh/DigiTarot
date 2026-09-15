import { useRef, useState } from 'react'
import { ALVO, prepararArquivo } from '../../lib/temas/imagens'

/** Lado da foto de perfil guardada. Quadrada, e pequena de propósito: ela vive
 *  como data URL dentro do perfil, que mora em localStorage. */
const LADO = { l: 192, a: 192 }

/**
 * A foto do perfil, com o lápis por cima para trocar.
 *
 * A imagem escolhida passa pelo mesmo pipeline das cartas — decodifica,
 * reamostra por metades e recorta em "cover" — e só então vira data URL. Sem
 * isso, uma foto de celular de 8 MB iria inteira para o localStorage e
 * estouraria a cota na primeira troca.
 */
export default function AvatarEditavel({
  foto,
  inicial,
  onFoto,
}: {
  foto: string
  /** Letra mostrada quando não há foto. */
  inicial: string
  onFoto: (dataUrl: string) => void
}) {
  const entrada = useRef<HTMLInputElement>(null)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const receber = async (f: File | undefined) => {
    if (!f) return
    setOcupado(true)
    setErro(null)
    try {
      const pronta = await prepararArquivo(f, LADO, 0.82)
      const leitor = new FileReader()
      leitor.onload = () => onFoto(String(leitor.result))
      leitor.onerror = () => setErro('Não deu para ler essa imagem.')
      leitor.readAsDataURL(pronta.blob)
    } catch {
      setErro('Formato de imagem não reconhecido.')
    } finally {
      setOcupado(false)
      // Zera o input: escolher o MESMO arquivo de novo não dispara `change`.
      if (entrada.current) entrada.current.value = ''
    }
  }

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={() => entrada.current?.click()}
        title="Trocar a foto"
        className="group relative block h-[112px] w-[112px] overflow-hidden rounded-full border border-white/20 transition hover:border-lilac/60"
        style={{ boxShadow: '0 0 28px -12px var(--color-violet)' }}
      >
        {foto ? (
          <img src={foto} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <span className="grid h-full w-full place-items-center bg-violet/35 font-display text-3xl text-star">
            {inicial}
          </span>
        )}

        {/* O lápis: sempre visível num cantinho, e a capa escurece no hover. */}
        <span
          aria-hidden
          className="absolute inset-0 grid place-items-center bg-void/55 opacity-0 transition group-hover:opacity-100"
        >
          <span className="text-[22px]">✎</span>
        </span>
        <span
          aria-hidden
          className="glass absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full text-[16px] text-star"
        >
          {ocupado ? '…' : '✎'}
        </span>
      </button>

      <input
        ref={entrada}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void receber(e.target.files?.[0])}
      />
      {erro && <p className="mt-2 max-w-[112px] text-[12px] leading-snug text-rose/90">{erro}</p>}
    </div>
  )
}

/** Reexportado para quem quiser o mesmo alvo noutro lugar. */
export { ALVO }
