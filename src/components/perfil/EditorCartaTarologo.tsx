import { useEffect, useState, type ChangeEvent } from 'react'
import CartaVisual from '../tarologos/CartaVisual'
import EditorApresentacaoTarologo from './EditorApresentacaoTarologo'
import { useAuth } from '../../lib/useAuth'
import { prepararImagemCarta } from '../../lib/imagemCartaTarologo'
import { TAROLOGO_RODRIGO } from '../../lib/backend/tarologo'
import type { TarologoPublico } from '../../lib/backend'

const EXEMPLO_CHIBI = `${import.meta.env.BASE_URL}rodrigo.png`
const PROMPT = `Use minha foto anexada para criar um personagem chibi tarólogo que se pareça comigo. Use o PNG do chibi do Rodrigo anexado somente como referência de estilo: personagem 3D delicado, expressão acolhedora, iluminação suave, detalhes de tarot e acabamento em tons roxos e dourados. Preserve minhas características reais (cabelo, pele, rosto e acessórios) sem copiar o rosto ou os acessórios do Rodrigo. Entregue uma única imagem PNG com fundo totalmente transparente, personagem centralizado, da cabeça até a cintura, sem texto, moldura ou cenário. Deixe espaço transparente ao redor para caber no verso de uma carta vertical.`

type Rascunho = { foto: string; personagem: string; alterado: boolean }

export default function EditorCartaTarologo() {
  const { usuario, backend } = useAuth()
  const [publicado, setPublicado] = useState<TarologoPublico | null>(null)
  const [rascunho, setRascunho] = useState<Rascunho | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [processando, setProcessando] = useState<'foto' | 'chibi' | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!backend || !usuario?.email) return
    return backend.observarTarologo(usuario.email, (perfil) => {
      const atual = perfil ?? (usuario.admin ? TAROLOGO_RODRIGO : null)
      setPublicado(atual)
      setRascunho((anterior) => anterior?.alterado ? anterior : atual
        ? { foto: atual.foto, personagem: atual.personagem, alterado: false }
        : null)
      setCarregando(false)
    })
  }, [backend, usuario?.email, usuario?.admin])

  if (!usuario || !backend) return null
  if (carregando) return <p className="text-mist/70">Carregando sua carta…</p>
  if (!publicado || !rascunho) {
    return (
      <div className="max-w-2xl rounded-2xl border border-gold/30 bg-gold/5 p-6 text-mist/80">
        Seu perfil de tarólogo ainda não foi criado. Peça ao administrador para cadastrar seu e-mail antes de publicar a carta.
      </div>
    )
  }

  const previa: TarologoPublico = { ...publicado, foto: rascunho.foto, personagem: rascunho.personagem }

  async function receberImagem(evento: ChangeEvent<HTMLInputElement>, tipo: 'foto' | 'chibi') {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!arquivo) return
    setProcessando(tipo)
    setErro('')
    setMensagem('')
    try {
      const imagem = await prepararImagemCarta(arquivo, tipo)
      setRascunho((atual) => atual ? {
        ...atual,
        [tipo === 'foto' ? 'foto' : 'personagem']: imagem,
        alterado: true,
      } : atual)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível abrir a imagem.')
    } finally {
      setProcessando(null)
    }
  }

  async function publicar() {
    if (!usuario?.email || !backend || !rascunho?.foto || salvando) return
    setSalvando(true)
    setErro('')
    setMensagem('')
    try {
      await backend.publicarCartaTarologo(usuario.email, rascunho.foto, rascunho.personagem)
      setRascunho((atual) => atual ? { ...atual, alterado: false } : atual)
      setMensagem('Carta aplicada na página de Tarólogos.')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível publicar a carta.')
    } finally {
      setSalvando(false)
    }
  }

  async function copiarPrompt() {
    try {
      await navigator.clipboard.writeText(PROMPT)
      setMensagem('Prompt copiado. Anexe sua foto e o PNG de exemplo no ChatGPT.')
    } catch {
      setErro('Não foi possível copiar. Selecione o texto do prompt e copie manualmente.')
    }
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <p className="text-[12px] uppercase tracking-[0.2em] text-gold">Sua vitrine</p>
        <h2 className="mt-2 font-display text-3xl text-star">Sua carta de tarólogo</h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-mist/75">
          Escolha a foto da frente e, se quiser, um chibi em PNG para o verso. A prévia muda aqui; a página pública só muda quando você aplicar.
        </p>
      </div>

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_335px]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 sm:p-6">
            <h3 className="font-display text-xl text-star">1. Sua foto</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-mist/70">Ela aparece na frente da carta. Escolha uma imagem nítida do rosto; o site ajusta o tamanho automaticamente.</p>
            <label className="mt-5 inline-flex cursor-pointer items-center rounded-xl border border-gold/50 px-5 py-3 text-[14px] font-semibold text-gold transition hover:bg-gold/10">
              {processando === 'foto' ? 'Preparando foto…' : 'Escolher foto'}
              <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(processando) || salvando} onChange={(e) => void receberImagem(e, 'foto')} />
            </label>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 sm:p-6">
            <h3 className="font-display text-xl text-star">2. Chibi no verso <span className="text-[14px] font-sans font-normal text-mist/55">(opcional)</span></h3>
            <p className="mt-2 text-[14px] leading-relaxed text-mist/70">Envie um PNG com fundo transparente. Sem chibi, o verso mostra apenas seu nome.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <label className="inline-flex cursor-pointer items-center rounded-xl border border-gold/50 px-5 py-3 text-[14px] font-semibold text-gold transition hover:bg-gold/10">
                {processando === 'chibi' ? 'Preparando chibi…' : 'Escolher PNG do chibi'}
                <input className="sr-only" type="file" accept="image/png" disabled={Boolean(processando) || salvando} onChange={(e) => void receberImagem(e, 'chibi')} />
              </label>
              {rascunho.personagem && (
                <button type="button" onClick={() => setRascunho({ ...rascunho, personagem: '', alterado: true })} className="rounded-xl border border-white/20 px-4 py-3 text-[14px] text-mist/80 hover:text-star">Remover chibi</button>
              )}
              <a href={EXEMPLO_CHIBI} download="chibi-rodrigo.png" className="rounded-xl border border-white/20 px-4 py-3 text-[14px] text-mist/80 hover:text-star">Baixar chibi do Rodrigo ↓</a>
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 sm:p-6">
            <h3 className="font-display text-xl text-star">Crie seu chibi com o ChatGPT</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-mist/70">Anexe uma foto sua e o PNG do Rodrigo como exemplo de estilo. Copie o texto abaixo para pedir o seu personagem.</p>
            <textarea readOnly value={PROMPT} aria-label="Prompt para criar seu chibi no ChatGPT" className="mt-4 min-h-44 w-full resize-y rounded-xl border border-white/15 bg-void/40 p-4 text-[13px] leading-relaxed text-mist/80" />
            <button type="button" onClick={() => void copiarPrompt()} className="mt-3 rounded-xl border border-gold/50 px-5 py-2.5 text-[14px] text-gold hover:bg-gold/10">Copiar prompt</button>
          </div>
        </div>

        <div className="xl:sticky xl:top-24">
          <p className="mb-3 text-[12px] uppercase tracking-[0.18em] text-gold">Prévia · clique para virar</p>
          <CartaVisual tarologo={previa} />
          <p className="mt-4 text-center text-[13px] text-mist/65">
            {!publicado.ativo
              ? 'Seu perfil está inativo. O administrador precisa ativá-lo para a carta aparecer.'
              : publicado.cartaoPublicado === false
                ? 'Sua carta ainda não está na página pública.'
                : 'Sua carta está na página pública.'}
          </p>
          {erro && <p role="alert" className="mt-4 rounded-xl border border-rose/40 bg-rose/10 p-3 text-[13px] text-rose">{erro}</p>}
          {mensagem && <p role="status" className="mt-4 rounded-xl border border-gold/35 bg-gold/10 p-3 text-[13px] text-gold">{mensagem}</p>}
          <button type="button" disabled={!rascunho.foto || Boolean(processando) || salvando} onClick={() => void publicar()} className="mt-5 w-full rounded-xl bg-gold px-5 py-3.5 text-[14px] font-semibold text-void transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45">
            {salvando ? 'Aplicando…' : 'Aplicar na página de Tarólogos'}
          </button>
          <p className="mt-3 text-center text-[12px] leading-relaxed text-mist/55">Só a foto e o chibi serão alterados. Suas modalidades e valores continuam sob gestão do administrador.</p>
        </div>
      </div>
      <EditorApresentacaoTarologo perfil={publicado} />
    </div>
  )
}
