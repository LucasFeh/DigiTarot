import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../../lib/useAuth'
import type { VinculacaoCamera } from '../../lib/backend'

export default function VincularCamera() {
  const { usuario, backend } = useAuth()
  const [vinculo, setVinculo] = useState<VinculacaoCamera | null>(null)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [agora, setAgora] = useState(Date.now)
  const appUrl = new URL('camera-app.html', new URL(import.meta.env.BASE_URL, window.location.origin)).toString() + '#/app-camera'
  const codigoAtivo = Boolean(vinculo?.codigo && vinculo.expiraEm > agora)
  const linkVinculacao = codigoAtivo ? `${appUrl}/${vinculo!.codigo}` : appUrl

  useEffect(() => {
    if (!backend || !usuario) return
    return backend.observarVinculacaoCamera(usuario.uid, setVinculo)
  }, [backend, usuario])

  useEffect(() => {
    if (!vinculo?.codigo) return
    const relogio = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(relogio)
  }, [vinculo?.codigo])

  const gerar = async () => {
    if (!backend || !usuario || ocupado) return
    setOcupado(true)
    setErro('')
    try { await backend.gerarCodigoCamera(usuario.uid) }
    catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível gerar o código.') }
    finally { setOcupado(false) }
  }

  const revogar = async () => {
    if (!backend || !usuario || ocupado) return
    setOcupado(true)
    setErro('')
    try { await backend.revogarCamera(usuario.uid) }
    catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível desvincular o celular.') }
    finally { setOcupado(false) }
  }

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h2 className="font-display text-2xl text-star">Câmera do celular</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mist/70">Instale o aplicativo, entre com sua conta de tarólogo e vincule este celular. Depois, toque em Câmera no aparelho: ele ficará pronto para a próxima mesa que você abrir.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <section className="glass rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-gold">1 · Instalar</p>
          <h3 className="mt-2 font-display text-lg text-star">Aplicativo DigiTarot Câmera</h3>
          <p className="mt-2 text-sm text-mist/70">Aponte a câmera do celular para o QR ou abra o link no próprio aparelho. No Android, escolha “Instalar aplicativo”; no iPhone, use “Adicionar à Tela de Início”.</p>
          <div className="mt-5 w-fit rounded-xl bg-white p-3"><QRCodeSVG value={appUrl} size={160} /></div>
          <a href={appUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block rounded-full border border-gold/50 px-4 py-2 text-sm text-gold">Abrir aplicativo ↗</a>
        </section>
        <section className="glass rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-gold">2 · Vincular</p>
          <h3 className="mt-2 font-display text-lg text-star">Código único deste acesso</h3>
          {vinculo?.dispositivoId ? <p className="mt-2 text-sm text-mist/70">Um celular está vinculado desde {new Date(vinculo.vinculadoEm).toLocaleDateString('pt-BR')}. Gerar novo código desvincula o anterior.</p> : <p className="mt-2 text-sm text-mist/70">Nenhum celular vinculado. O código expira em 10 minutos e só funciona após entrar na sua conta.</p>}
          {codigoAtivo ? (
            <>
              <p className="mt-5 font-mono text-3xl tracking-[0.18em] text-gold" aria-label={`Código ${vinculo!.codigo}`}>{vinculo!.codigo}</p>
              <p className="mt-1 text-xs text-mist/60">Válido até {new Date(vinculo!.expiraEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              <div className="mt-4 w-fit rounded-xl bg-white p-3"><QRCodeSVG value={linkVinculacao} size={160} /></div>
              <button type="button" onClick={() => { void navigator.clipboard.writeText(vinculo!.codigo).then(() => setCopiado(true)).catch(() => setErro('Não foi possível copiar o código.')) }} className="mt-3 block rounded-full border border-white/25 px-4 py-2 text-sm text-star">{copiado ? 'Copiado' : 'Copiar código'}</button>
            </>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" disabled={ocupado} onClick={() => void gerar()} className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-void disabled:opacity-50">{codigoAtivo ? 'Gerar outro código' : 'Gerar código'}</button>
            {vinculo?.dispositivoId && <button type="button" disabled={ocupado} onClick={() => void revogar()} className="rounded-full border border-rose/40 px-4 py-2 text-sm text-rose disabled:opacity-50">Desvincular celular</button>}
          </div>
        </section>
      </div>
      {erro && <p role="alert" className="text-sm text-rose">{erro}</p>}
      <p className="text-xs leading-relaxed text-mist/55">A transmissão exige o aplicativo aberto e a tela do celular ligada. A imagem e o áudio são enviados pela conexão WebRTC; o Firestore guarda apenas os dados necessários para estabelecer a chamada.</p>
    </div>
  )
}
