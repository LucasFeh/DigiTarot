import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../lib/useAuth'
import { useHashRoute } from '../lib/useHashRoute'
import { novoToken } from '../lib/backend/local'
import { criarPeer, oferecer, receberResposta } from '../lib/webrtc'
import { PROPORCAO_CAMERA_RETRATO } from '../lib/posicaoCamera'
import type { SinalMidia, VinculacaoCamera } from '../lib/backend'
import LoginPage from './LoginPage'

const CHAVE_APARELHO = 'digitarot.camera.dispositivo'

function idDesteAparelho(): string {
  try {
    const existente = localStorage.getItem(CHAVE_APARELHO)
    if (existente) return existente
    const novo = novoToken()
    localStorage.setItem(CHAVE_APARELHO, novo)
    return novo
  } catch {
    return ''
  }
}

/** Interface enxuta para ser instalada na tela inicial do celular. */
export default function AppCameraPage() {
  const { partes } = useHashRoute()
  const { usuario, backend, carregando, sair } = useAuth()
  const [dispositivoId] = useState(idDesteAparelho)
  const [codigo, setCodigo] = useState(partes[1] ?? '')
  const [vinculo, setVinculo] = useState<VinculacaoCamera | null>(null)
  const [mesaId, setMesaId] = useState<string | null>(null)
  const [ligada, setLigada] = useState(false)
  const [mudo, setMudo] = useState(false)
  const [temMicrofone, setTemMicrofone] = useState(false)
  const [estado, setEstado] = useState('Toque em Câmera para preparar a transmissão.')
  const [instalar, setInstalar] = useState<Event & { prompt?: () => Promise<void> } | null>(null)
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const peer = useRef<RTCPeerConnection | null>(null)
  const iniciando = useRef(false)
  const vinculado = Boolean(dispositivoId && vinculo?.dispositivoId === dispositivoId)

  useEffect(() => {
    const receber = (evento: Event) => { evento.preventDefault(); setInstalar(evento as Event & { prompt?: () => Promise<void> }) }
    window.addEventListener('beforeinstallprompt', receber)
    return () => window.removeEventListener('beforeinstallprompt', receber)
  }, [])

  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}camera-sw.js`, { scope: import.meta.env.BASE_URL })
    }
  }, [])

  useEffect(() => {
    if (!backend || !usuario || usuario.papel !== 'tarologo') return
    return backend.observarVinculacaoCamera(usuario.uid, (v) => {
      setVinculo(v)
      if (v?.dispositivoId === dispositivoId) return
      peer.current?.close()
      peer.current = null
      stream.current?.getTracks().forEach((t) => t.stop())
      stream.current = null
      if (video.current) video.current.srcObject = null
      setLigada(false)
      setTemMicrofone(false)
    })
  }, [backend, usuario, dispositivoId])

  useEffect(() => {
    if (!backend || !usuario || !vinculado) return
    return backend.observarMesaAtiva(usuario.uid, setMesaId)
  }, [backend, usuario, vinculado])

  const parar = () => {
    if (backend && mesaId) void backend.salvarSinal(mesaId, 'app-camera', { oferta: '', resposta: '' }).catch(() => {})
    peer.current?.close()
    peer.current = null
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
    if (video.current) video.current.srcObject = null
    setLigada(false)
    setMudo(false)
    setTemMicrofone(false)
    setEstado('Câmera desligada.')
  }

  useEffect(() => () => {
    peer.current?.close()
    stream.current?.getTracks().forEach((t) => t.stop())
  }, [])

  useEffect(() => {
    if (!backend || !mesaId || !ligada || !vinculado || !stream.current) {
      peer.current?.close()
      peer.current = null
      return
    }
    let cancelado = false
    const conexao = criarPeer()
    peer.current = conexao
    const versao = novoToken()
    const capturada = stream.current
    capturada.getTracks().forEach((faixa) => conexao.addTrack(faixa, capturada))
    conexao.onconnectionstatechange = () => {
      if (cancelado) return
      if (conexao.connectionState === 'connected') setEstado('Câmera e microfone conectados à mesa.')
      if (conexao.connectionState === 'failed' || conexao.connectionState === 'disconnected') setEstado('Conexão interrompida. Desligue e ligue a câmera para tentar novamente.')
    }
    const pararSinal = backend.observarSinal(mesaId, 'app-camera', (sinal: SinalMidia | null) => {
      if (cancelado || sinal?.versao !== versao || !sinal.resposta || sinal.resposta === 'encerrar') return
      void receberResposta(conexao, sinal.resposta).catch(() => setEstado('Falha na conexão. Desligue e ligue a câmera.'))
    })
    void oferecer(conexao)
      .then((oferta) => backend.salvarSinal(mesaId, 'app-camera', {
        tipo: 'camera', versao, oferta, resposta: '', dispositivoId,
      }))
      .then(() => { if (!cancelado) setEstado('Conectando à mesa…') })
      .catch(() => { if (!cancelado) setEstado('Não foi possível enviar a câmera. Confira as regras do Firebase e a conexão.') })
    return () => {
      cancelado = true
      pararSinal()
      conexao.close()
      if (peer.current === conexao) peer.current = null
    }
  }, [backend, mesaId, ligada, vinculado, dispositivoId])

  const ativar = async () => {
    if (iniciando.current || ligada) return
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
      setEstado('Este aparelho precisa de HTTPS e de um navegador com câmera e WebRTC.')
      return
    }
    iniciando.current = true
    try {
      setEstado('Pedindo acesso à câmera e ao microfone…')
      let capturada: MediaStream
      const videoRetrato = {
        facingMode: { ideal: 'environment' },
        width: { ideal: 720 },
        height: { ideal: 1280 },
        aspectRatio: { ideal: PROPORCAO_CAMERA_RETRATO },
      }
      try {
        capturada = await navigator.mediaDevices.getUserMedia({
          video: videoRetrato,
          audio: { echoCancellation: true, noiseSuppression: true },
        })
      } catch {
        capturada = await navigator.mediaDevices.getUserMedia({ video: videoRetrato, audio: false })
        setEstado('Microfone indisponível. A câmera funcionará sem voz.')
      }
      stream.current = capturada
      setTemMicrofone(capturada.getAudioTracks().length > 0)
      if (video.current) video.current.srcObject = capturada
      setLigada(true)
      if (!mesaId) setEstado(capturada.getAudioTracks().length ? 'Câmera e microfone prontos. Aguardando uma mesa…' : 'Câmera pronta sem microfone. Aguardando uma mesa…')
    } catch {
      setEstado('Não foi possível abrir a câmera. Confira as permissões do celular.')
    } finally {
      iniciando.current = false
    }
  }

  const vincular = async (evento: React.FormEvent) => {
    evento.preventDefault()
    if (!backend || !usuario || !dispositivoId) return
    try {
      await backend.vincularCamera(usuario.uid, codigo.trim(), dispositivoId)
      setCodigo('')
      setEstado('Celular vinculado. Toque em Câmera para preparar a leitura.')
    } catch (e) {
      setEstado(e instanceof Error ? e.message : 'Código inválido.')
    }
  }

  if (carregando || !backend) return <main className="grid min-h-svh place-items-center text-mist">Abrindo aplicativo…</main>
  if (!usuario) return <LoginPage titulo="DigiTarot Câmera" descricao="Entre com a mesma conta de tarólogo que você usa no site." voltarPara={`${import.meta.env.BASE_URL}#/`} />
  if (usuario.papel !== 'tarologo') return <main className="grid min-h-svh place-items-center px-6 text-center text-mist">Este aplicativo é para contas de tarólogo. Entre com a conta criada para seus atendimentos.</main>

  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col gap-5 bg-void px-5 pb-8 pt-7 text-star">
      <header className="flex items-start justify-between gap-3">
        <div><p className="text-xs uppercase tracking-[0.25em] text-gold">DigiTarot</p><h1 className="mt-1 font-display text-2xl">Câmera da mesa</h1></div>
        <button type="button" onClick={() => { parar(); void sair() }} className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-mist">Sair</button>
      </header>
      {!dispositivoId && <p className="rounded-xl border border-rose/40 p-3 text-sm text-rose">Ative o armazenamento deste navegador para vincular o aparelho.</p>}
      {!vinculado ? (
        <section className="rounded-2xl border border-gold/25 bg-white/[0.04] p-5">
          <h2 className="font-display text-lg">Vincular este celular</h2>
          <p className="mt-2 text-sm leading-relaxed text-mist">No computador, abra Perfil → Câmera do celular e gere um código. Digite os 8 números aqui. O código expira em 10 minutos.</p>
          <form onSubmit={(e) => void vincular(e)} className="mt-5 flex gap-2">
            <input type="text" inputMode="numeric" pattern="[0-9]{8}" maxLength={8} required value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))} aria-label="Código de vinculação" placeholder="00000000" className="min-w-0 flex-1 rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-center font-mono text-xl tracking-[0.2em] outline-none focus:border-gold" />
            <button type="submit" disabled={!dispositivoId || codigo.length !== 8} className="rounded-xl bg-gold px-4 font-semibold text-void disabled:opacity-40">Vincular</button>
          </form>
        </section>
      ) : (
        <>
          <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-black">
            <video ref={video} autoPlay muted playsInline aria-hidden={!ligada} className="aspect-[9/16] max-h-[60svh] w-full object-contain" />
            {!ligada && <div className="absolute inset-0 grid place-items-center text-center text-sm text-mist/60"><span><span aria-hidden className="mb-3 block text-4xl text-gold/70">◉</span>Câmera desligada</span></div>}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => ligada ? parar() : void ativar()} className={`flex-1 rounded-xl px-5 py-3.5 font-semibold ${ligada ? 'border border-rose/50 text-rose' : 'bg-gold text-void'}`}>{ligada ? 'Desligar câmera' : 'Câmera'}</button>
            {ligada && temMicrofone ? <button type="button" onClick={() => { const proximo = !mudo; stream.current?.getAudioTracks().forEach((t) => { t.enabled = !proximo }); setMudo(proximo) }} className="rounded-xl border border-white/20 px-4 text-sm">{mudo ? 'Ativar microfone' : 'Silenciar'}</button> : null}
          </div>
          <p className="text-center text-xs text-mist/60">Mantenha o aplicativo aberto e a tela ligada durante a leitura.</p>
          <p className="text-center text-xs text-mist/60">Sua voz sai pelo microfone do celular. A voz do cliente é ouvida no computador, pela conversa da mesa.</p>
        </>
      )}
      <p role="status" className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm text-mist">{ligada && !mesaId ? `Câmera pronta${temMicrofone ? ' e microfone pronto' : ' sem microfone'}. Aguardando você abrir uma mesa no computador…` : estado}</p>
      {instalar?.prompt && <button type="button" onClick={() => { void instalar.prompt?.(); setInstalar(null) }} className="rounded-xl border border-gold/50 px-4 py-3 text-sm text-gold">Instalar aplicativo neste celular</button>}
      <p className="text-center text-xs leading-relaxed text-mist/50">No iPhone, use Compartilhar → Adicionar à Tela de Início. No Android, use Instalar aplicativo no menu do navegador.</p>
    </main>
  )
}
