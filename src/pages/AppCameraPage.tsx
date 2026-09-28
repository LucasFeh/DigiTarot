import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../lib/useAuth'
import { useHashRoute } from '../lib/useHashRoute'
import { novoToken } from '../lib/backend/local'
import { criarPeer, oferecer, receberResposta } from '../lib/webrtc'
import { cameraEmPaisagem, restricoesCamera } from '../lib/capturaCamera'
import { guiasDaCamera } from '../lib/posicaoCartaCamera'
import { SPREAD_BY_ID } from '../data/spreads'
import type { Sessao, SinalMidia, VinculacaoCamera } from '../lib/backend'
import LoginPage from './LoginPage'

const CHAVE_APARELHO = 'digitarot.camera.dispositivo'

function assinaturaVersao(documento: Document): string {
  return Array.from(documento.querySelectorAll('script[type="module"][src], link[rel="modulepreload"], link[rel="stylesheet"]'))
    .map((elemento) => elemento.getAttribute('src') ?? elemento.getAttribute('href') ?? '')
    .join('|')
}

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
  const [sessaoAtiva, setSessaoAtiva] = useState<Sessao | null>(null)
  const [ligada, setLigada] = useState(false)
  const [telaHorizontal, setTelaHorizontal] = useState(cameraEmPaisagem)
  const [proporcaoVideo, setProporcaoVideo] = useState(9 / 16)
  const [atualizacaoDisponivel, setAtualizacaoDisponivel] = useState(false)
  const [mudo, setMudo] = useState(false)
  const [temMicrofone, setTemMicrofone] = useState(false)
  const [estado, setEstado] = useState('Toque em Câmera para preparar a transmissão.')
  const [instalar, setInstalar] = useState<Event & { prompt?: () => Promise<void> } | null>(null)
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const peer = useRef<RTCPeerConnection | null>(null)
  const iniciando = useRef(false)
  const telaCheiaDaCamera = useRef(false)
  const vinculado = Boolean(dispositivoId && vinculo?.dispositivoId === dispositivoId)
  const mesaAtual = sessaoAtiva?.id === mesaId && !sessaoAtiva.encerrada ? sessaoAtiva : null
  const spread = SPREAD_BY_ID.get(mesaAtual?.spreadId ?? 'una')
  const guiasAtivas = mesaAtual?.cameraGuias === true
  const guias = spread ? guiasDaCamera(spread) : []

  useEffect(() => {
    const receber = (evento: Event) => { evento.preventDefault(); setInstalar(evento as Event & { prompt?: () => Promise<void> }) }
    window.addEventListener('beforeinstallprompt', receber)
    return () => window.removeEventListener('beforeinstallprompt', receber)
  }, [])

  useEffect(() => {
    if (!import.meta.env.PROD) return
    try { screen.orientation?.unlock() } catch { /* A rotação segue a configuração do aparelho. */ }
    let cancelado = false
    let registro: ServiceWorkerRegistration | null = null
    const versaoAtual = assinaturaVersao(document)
    const verificar = async () => {
      if (document.visibilityState === 'hidden') return
      try {
        await registro?.update()
        const url = `${import.meta.env.BASE_URL}camera-app.html?atualizacao=${Date.now()}`
        const resposta = await fetch(url, { cache: 'no-store' })
        if (!resposta.ok || cancelado) return
        const html = new DOMParser().parseFromString(await resposta.text(), 'text/html')
        const ultimaVersao = assinaturaVersao(html)
        if (ultimaVersao && versaoAtual && ultimaVersao !== versaoAtual) setAtualizacaoDisponivel(true)
      } catch {
        // Sem rede, a versão instalada continua utilizável.
      }
    }
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}camera-sw.js`, {
        scope: import.meta.env.BASE_URL,
        updateViaCache: 'none',
      }).then((r) => { registro = r; return verificar() }).catch(() => {})
    } else {
      void verificar()
    }
    const aoVisivel = () => { if (document.visibilityState === 'visible') void verificar() }
    window.addEventListener('focus', aoVisivel)
    document.addEventListener('visibilitychange', aoVisivel)
    const intervalo = window.setInterval(() => void verificar(), 5 * 60 * 1000)
    return () => {
      cancelado = true
      window.removeEventListener('focus', aoVisivel)
      document.removeEventListener('visibilitychange', aoVisivel)
      window.clearInterval(intervalo)
    }
  }, [])

  useEffect(() => {
    if (atualizacaoDisponivel && !ligada && !codigo) window.location.reload()
  }, [atualizacaoDisponivel, ligada, codigo])

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
      setProporcaoVideo(9 / 16)
      try { screen.orientation?.unlock() } catch { /* O sistema decide a orientação. */ }
      if (telaCheiaDaCamera.current && document.fullscreenElement) void document.exitFullscreen().catch(() => {})
      telaCheiaDaCamera.current = false
    })
  }, [backend, usuario, dispositivoId])

  useEffect(() => {
    if (!backend || !usuario || !vinculado) return
    return backend.observarMesaAtiva(usuario.uid, setMesaId)
  }, [backend, usuario, vinculado])

  useEffect(() => {
    if (!backend || !mesaId || !vinculado) return
    return backend.observarSessao(mesaId, setSessaoAtiva)
  }, [backend, mesaId, vinculado])

  const liberarOrientacao = () => {
    try { screen.orientation?.unlock() } catch { /* O sistema decide a orientação. */ }
    if (telaCheiaDaCamera.current && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {})
    }
    telaCheiaDaCamera.current = false
  }

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
    setProporcaoVideo(9 / 16)
    setEstado('Câmera desligada.')
    liberarOrientacao()
  }

  useEffect(() => () => {
    peer.current?.close()
    stream.current?.getTracks().forEach((t) => t.stop())
    try { screen.orientation?.unlock() } catch { /* O sistema decide a orientação. */ }
    if (telaCheiaDaCamera.current && document.fullscreenElement) void document.exitFullscreen().catch(() => {})
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

  useEffect(() => {
    if (!ligada) return
    let paisagemAnterior = cameraEmPaisagem()
    let espera: ReturnType<typeof setTimeout> | undefined
    const aoGirar = () => {
      const paisagem = cameraEmPaisagem()
      setTelaHorizontal(paisagem)
      if (paisagem === paisagemAnterior) return
      paisagemAnterior = paisagem
      if (espera) clearTimeout(espera)
      espera = setTimeout(() => {
        void (async () => {
          const atual = stream.current
          const faixa = atual?.getVideoTracks()[0]
          if (!atual || !faixa) return
          try {
            await faixa.applyConstraints(restricoesCamera(true))
          } catch {
            // Alguns navegadores só mudam a orientação ao abrir uma nova faixa.
          }
          if (stream.current !== atual) return
          const { width, height } = faixa.getSettings()
          if (width && height && width > height) return
          try {
            const novaCaptura = await navigator.mediaDevices.getUserMedia({ video: restricoesCamera(true), audio: false })
            const novaFaixa = novaCaptura.getVideoTracks()[0]
            if (!novaFaixa || stream.current !== atual) {
              novaCaptura.getTracks().forEach((t) => t.stop())
              return
            }
            const emissor = peer.current?.getSenders().find((s) => s.track?.kind === 'video')
            if (emissor) await emissor.replaceTrack(novaFaixa)
            atual.removeTrack(faixa)
            faixa.stop()
            atual.addTrack(novaFaixa)
            if (video.current) {
              video.current.srcObject = null
              video.current.srcObject = atual
            }
          } catch {
            setEstado('O navegador não ajustou a imagem. Desligue e ligue a câmera com o celular na posição desejada.')
          }
        })()
      }, 250)
    }
    window.addEventListener('resize', aoGirar)
    window.addEventListener('orientationchange', aoGirar)
    screen.orientation?.addEventListener('change', aoGirar)
    return () => {
      if (espera) clearTimeout(espera)
      window.removeEventListener('resize', aoGirar)
      window.removeEventListener('orientationchange', aoGirar)
      screen.orientation?.removeEventListener('change', aoGirar)
    }
  }, [ligada])

  const ativar = async () => {
    if (iniciando.current || ligada) return
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
      setEstado('Este aparelho precisa de HTTPS e de um navegador com câmera e WebRTC.')
      return
    }
    iniciando.current = true
    try {
      let travouPaisagem = false
      try {
        if (screen.orientation?.lock) {
          await screen.orientation.lock('landscape')
          travouPaisagem = true
        }
      } catch { /* Tenta novamente em tela cheia quando permitido. */ }
      if (!travouPaisagem && screen.orientation?.lock && !document.fullscreenElement && document.documentElement.requestFullscreen) {
        try {
          await document.documentElement.requestFullscreen()
          telaCheiaDaCamera.current = true
          if (screen.orientation?.lock) {
            await screen.orientation.lock('landscape')
            travouPaisagem = true
          }
        } catch { /* O navegador ou o sistema pode impedir a rotação. */ }
      }
      if (!travouPaisagem && telaCheiaDaCamera.current && document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {})
        telaCheiaDaCamera.current = false
      }
      setTelaHorizontal(cameraEmPaisagem())
      setProporcaoVideo(16 / 9)
      setEstado('Pedindo acesso à câmera e ao microfone…')
      let capturada: MediaStream
      try {
        capturada = await navigator.mediaDevices.getUserMedia({
          video: restricoesCamera(true),
          audio: { echoCancellation: true, noiseSuppression: true },
        })
      } catch {
        capturada = await navigator.mediaDevices.getUserMedia({ video: restricoesCamera(true), audio: false })
        setEstado('Microfone indisponível. A câmera funcionará sem voz.')
      }
      const { width, height } = capturada.getVideoTracks()[0]?.getSettings() ?? {}
      if (width && height && width <= height) {
        capturada.getTracks().forEach((t) => t.stop())
        liberarOrientacao()
        setEstado('A câmera não iniciou na horizontal. Gire o celular, ative a Rotação automática e toque em Câmera novamente.')
        return
      }
      stream.current = capturada
      setTemMicrofone(capturada.getAudioTracks().length > 0)
      if (video.current) video.current.srcObject = capturada
      setLigada(true)
      if (!mesaId) setEstado(capturada.getAudioTracks().length ? 'Câmera e microfone prontos. Aguardando uma mesa…' : 'Câmera pronta sem microfone. Aguardando uma mesa…')
    } catch {
      liberarOrientacao()
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

  const alternarGuias = async () => {
    if (!backend || !mesaAtual) return
    try {
      await backend.atualizarSessao(mesaAtual.id, { cameraGuias: !guiasAtivas })
    } catch {
      setEstado('Não foi possível alterar as posições da câmera. Tente novamente.')
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
          <div className="relative mx-auto overflow-hidden rounded-2xl border border-white/15 bg-black"
            style={{ width: `min(100%, ${proporcaoVideo * 66}svh)`, aspectRatio: proporcaoVideo }}>
            <video ref={video} autoPlay muted playsInline aria-hidden={!ligada}
              onLoadedMetadata={(e) => {
                const { videoWidth, videoHeight } = e.currentTarget
                if (videoWidth && videoHeight) setProporcaoVideo(videoWidth / videoHeight)
              }}
              onResize={(e) => {
                const { videoWidth, videoHeight } = e.currentTarget
                if (videoWidth && videoHeight) setProporcaoVideo(videoWidth / videoHeight)
              }}
              className="absolute inset-0 h-full w-full object-contain" />
            {ligada && guiasAtivas && <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              {guias.map((guia) => <div key={guia.slot}
                className="absolute rounded-md border-2 border-gold bg-gold/10 shadow-[0_0_14px_#f4d48988]"
                style={{ left: `${guia.x * 100}%`, top: `${guia.y * 100}%`, width: `${guia.largura * 100}%`, height: `${guia.altura * 100}%`, transform: 'translate(-50%, -50%)' }}>
                <span className="absolute -left-1 -top-2 rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-bold leading-none text-void">{guia.slot + 1}</span>
              </div>)}
            </div>}
            {!ligada && <div className="absolute inset-0 grid place-items-center text-center text-sm text-mist/60"><span><span aria-hidden className="mb-3 block text-4xl text-gold/70">◉</span>Câmera desligada</span></div>}
          </div>
          {ligada && !telaHorizontal && <p role="alert" className="rounded-xl border border-gold/50 bg-gold/10 px-4 py-3 text-center text-sm leading-relaxed text-gold">
            Gire o celular na horizontal. Se a tela não acompanhar, ative a Rotação automática nas configurações do aparelho. A câmera está configurada para transmitir na horizontal.
          </p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => ligada ? parar() : void ativar()} className={`flex-1 rounded-xl px-5 py-3.5 font-semibold ${ligada ? 'border border-rose/50 text-rose' : 'bg-gold text-void'}`}>{ligada ? 'Desligar câmera' : 'Câmera'}</button>
            {ligada && temMicrofone ? <button type="button" onClick={() => { const proximo = !mudo; stream.current?.getAudioTracks().forEach((t) => { t.enabled = !proximo }); setMudo(proximo) }} className="rounded-xl border border-white/20 px-4 text-sm">{mudo ? 'Ativar microfone' : 'Silenciar'}</button> : null}
          </div>
          <button type="button" onClick={() => void alternarGuias()} disabled={!mesaAtual} aria-pressed={guiasAtivas}
            className={`rounded-xl border px-4 py-3 text-sm font-semibold disabled:opacity-45 ${guiasAtivas ? 'border-gold bg-gold/15 text-gold' : 'border-white/20 text-mist'}`}>
            {guiasAtivas ? 'Desabilitar posições' : 'Habilitar posição'}
          </button>
          <p className="text-center text-xs leading-relaxed text-mist/60">
            {mesaAtual ? `${spread?.nome ?? 'Layout'} · coloque as cartas dentro das marcações. O layout acompanha a mesa.` : 'Abra uma mesa no computador para habilitar as posições das cartas.'}
          </p>
          <p className="text-center text-xs text-mist/60">Mantenha o aplicativo aberto e a tela ligada durante a leitura.</p>
          <p className="text-center text-xs text-mist/60">Sua voz sai pelo microfone do celular. A voz do cliente é ouvida no computador, pela conversa da mesa.</p>
        </>
      )}
      <p role="status" className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm text-mist">{ligada && !mesaId ? `Câmera pronta${temMicrofone ? ' e microfone pronto' : ' sem microfone'}. Aguardando você abrir uma mesa no computador…` : estado}</p>
      {atualizacaoDisponivel && (ligada || codigo) && <p className="rounded-xl border border-gold/35 px-4 py-2 text-center text-xs text-gold">Nova versão pronta. Ela será aplicada automaticamente {ligada ? 'quando você desligar a câmera' : 'após vincular este celular'}.</p>}
      {instalar?.prompt && <button type="button" onClick={() => { void instalar.prompt?.(); setInstalar(null) }} className="rounded-xl border border-gold/50 px-4 py-3 text-sm text-gold">Instalar aplicativo neste celular</button>}
      <p className="text-center text-xs leading-relaxed text-mist/50">No iPhone, use Compartilhar → Adicionar à Tela de Início. No Android, use Instalar aplicativo no menu do navegador.</p>
    </main>
  )
}
