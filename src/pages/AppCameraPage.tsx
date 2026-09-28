import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../lib/useAuth'
import { useHashRoute } from '../lib/useHashRoute'
import { novoToken } from '../lib/backend/local'
import { criarPeer, oferecer, receberResposta } from '../lib/webrtc'
import { cameraEmPaisagem, restricoesCamera } from '../lib/capturaCamera'
import { guiasDaCamera } from '../lib/posicaoCartaCamera'
import { SPREAD_BY_ID } from '../data/spreads'
import type { Sessao, SinalMidia, VinculacaoCamera } from '../lib/backend'
import LoginPage from './LoginPage'
import { GeralCamera, MinhaCartaCamera, TiragensCamera, type SecaoCamera } from '../components/camera/AppCameraSections'

const CHAVE_APARELHO = 'digitarot.camera.dispositivo'

function IconeMicrofone({ mudo }: { mudo: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <rect x="9" y="3" width="6" height="12" rx="3" />
    <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" />
    {mudo && <path d="M3 3l18 18" />}
  </svg>
}

function IconePosicoes() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
    <rect x="9" y="7" width="6" height="10" rx="1" />
  </svg>
}

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
  const [mesaEnviandoId, setMesaEnviandoId] = useState<string | null>(null)
  const [telaHorizontal, setTelaHorizontal] = useState(cameraEmPaisagem)
  const [proporcaoVideo, setProporcaoVideo] = useState(16 / 9)
  const [atualizacaoDisponivel, setAtualizacaoDisponivel] = useState(false)
  const [mudo, setMudo] = useState(false)
  const [temMicrofone, setTemMicrofone] = useState(false)
  const [estado, setEstado] = useState('Preparando a câmera…')
  const [instalar, setInstalar] = useState<Event & { prompt?: () => Promise<void> } | null>(null)
  const [secao, setSecao] = useState<SecaoCamera>('camera')
  const [menuAberto, setMenuAberto] = useState(false)
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const peer = useRef<RTCPeerConnection | null>(null)
  const iniciando = useRef(false)
  const autoIniciada = useRef<string | null>(null)
  const telaCheiaDaCamera = useRef(false)
  const vinculado = Boolean(dispositivoId && vinculo?.dispositivoId === dispositivoId)
  const mesaAtual = sessaoAtiva?.id === mesaId && !sessaoAtiva.encerrada ? sessaoAtiva : null
  const transmitindo = ligada && Boolean(mesaAtual && mesaEnviandoId === mesaAtual.id && vinculado)
  const sessaoIdParaEnvio = transmitindo ? mesaAtual?.id ?? null : null
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
    if (atualizacaoDisponivel && !transmitindo && !codigo) window.location.reload()
  }, [atualizacaoDisponivel, transmitindo, codigo])

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
      setMesaEnviandoId(null)
      setTemMicrofone(false)
      setProporcaoVideo(16 / 9)
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

  const liberarOrientacao = useCallback(() => {
    try { screen.orientation?.unlock() } catch { /* O sistema decide a orientação. */ }
    if (telaCheiaDaCamera.current && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {})
    }
    telaCheiaDaCamera.current = false
  }, [])

  const parar = () => {
    if (backend && mesaId) void backend.salvarSinal(mesaId, 'app-camera', { oferta: '', resposta: '' }).catch(() => {})
    peer.current?.close()
    peer.current = null
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
    if (video.current) video.current.srcObject = null
    setLigada(false)
    setMesaEnviandoId(null)
    setMudo(false)
    setTemMicrofone(false)
    setProporcaoVideo(16 / 9)
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
    if (!backend || !sessaoIdParaEnvio || !stream.current) {
      peer.current?.close()
      peer.current = null
      return
    }
    const sessaoId = sessaoIdParaEnvio
    let cancelado = false
    const conexao = criarPeer()
    peer.current = conexao
    const versao = novoToken()
    const capturada = stream.current
    capturada.getTracks().forEach((faixa) => conexao.addTrack(faixa, capturada))
    conexao.onconnectionstatechange = () => {
      if (cancelado) return
      if (conexao.connectionState === 'connected') setEstado('Câmera e microfone conectados à mesa.')
      if (conexao.connectionState === 'failed' || conexao.connectionState === 'disconnected') {
        setEstado('Conexão interrompida. Toque na bolinha para tentar novamente.')
        setMesaEnviandoId(null)
      }
    }
    const pararSinal = backend.observarSinal(sessaoId, 'app-camera', (sinal: SinalMidia | null) => {
      if (cancelado || sinal?.versao !== versao || !sinal.resposta || sinal.resposta === 'encerrar') return
      void receberResposta(conexao, sinal.resposta).catch(() => {
        setEstado('Falha na conexão. Toque na bolinha para tentar novamente.')
        setMesaEnviandoId(null)
      })
    })
    void oferecer(conexao)
      .then((oferta) => {
        if (cancelado) return
        return backend.salvarSinal(sessaoId, 'app-camera', {
          tipo: 'camera', versao, oferta, resposta: '', dispositivoId,
        })
      })
      .then(() => { if (!cancelado) setEstado('Conectando à mesa…') })
      .catch(() => {
        if (cancelado) return
        setEstado('Não foi possível enviar a câmera. Confira a conexão e tente novamente.')
        setMesaEnviandoId(null)
      })
    return () => {
      cancelado = true
      pararSinal()
      conexao.close()
      if (peer.current === conexao) peer.current = null
      void backend.salvarSinal(sessaoId, 'app-camera', { oferta: '', resposta: '' }).catch(() => {})
    }
  }, [backend, sessaoIdParaEnvio, dispositivoId])

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

  const ativar = useCallback(async () => {
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
        setEstado('A câmera não iniciou na horizontal. Gire o celular, ative a Rotação automática e toque em Ligar câmera novamente.')
        return
      }
      stream.current = capturada
      setTemMicrofone(capturada.getAudioTracks().length > 0)
      if (video.current) video.current.srcObject = capturada
      setLigada(true)
      setEstado(capturada.getAudioTracks().length ? 'Prévia ativa. Transmissão desligada.' : 'Prévia ativa sem microfone. Transmissão desligada.')
    } catch {
      liberarOrientacao()
      setEstado('Não foi possível abrir a câmera. Confira as permissões do celular.')
    } finally {
      iniciando.current = false
    }
  }, [ligada, liberarOrientacao])

  useEffect(() => {
    if (!usuario || usuario.papel !== 'tarologo' || !vinculado) return
    const chave = `${usuario.uid}:${dispositivoId}`
    if (autoIniciada.current === chave) return
    autoIniciada.current = chave
    void ativar()
  }, [usuario, vinculado, dispositivoId, ativar])

  const vincular = async (evento: React.FormEvent) => {
    evento.preventDefault()
    if (!backend || !usuario || !dispositivoId) return
    try {
      await backend.vincularCamera(usuario.uid, codigo.trim(), dispositivoId)
      setCodigo('')
      setEstado('Celular vinculado. Preparando a câmera…')
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

  if (carregando || !backend) return <main className="grid min-h-svh place-items-center bg-void text-mist">Abrindo aplicativo…</main>
  if (!usuario) return <LoginPage titulo="DigiTarot Câmera" descricao="Entre com a mesma conta de tarólogo que você usa no site." voltarPara={`${import.meta.env.BASE_URL}#/`} />
  if (usuario.papel !== 'tarologo') return <main className="grid min-h-svh place-items-center bg-void px-6 text-center text-star">
    <div className="max-w-sm">
      <span aria-hidden className="text-5xl text-gold">✦</span>
      <h1 className="mt-4 font-display text-2xl">Acesso de clientes em breve</h1>
      <p className="mt-3 text-sm leading-relaxed text-mist">O aplicativo da câmera está disponível para tarólogos. Sua conta de cliente continua funcionando no site.</p>
      <button type="button" onClick={() => void sair()} className="mt-6 rounded-xl border border-gold/50 px-6 py-3 text-gold">Sair</button>
    </div>
  </main>

  const escolher = (proxima: SecaoCamera) => { setSecao(proxima); setMenuAberto(false) }
  const alternarTransmissao = () => {
    if (!ligada || !mesaAtual) return
    if (transmitindo) {
      peer.current?.close()
      peer.current = null
    }
    setEstado(transmitindo ? 'Prévia ativa. Transmissão pausada.' : 'Conectando à mesa…')
    setMesaEnviandoId(transmitindo ? null : mesaAtual.id)
  }
  const secoes: { id: SecaoCamera; titulo: string; icone: string }[] = [
    { id: 'camera', titulo: 'Câmera', icone: '◉' },
    { id: 'geral', titulo: 'Geral', icone: '☾' },
    { id: 'tiragem', titulo: 'Minha tiragem', icone: '☷' },
    { id: 'carta', titulo: 'Minha carta', icone: '✦' },
  ]

  return (
    <main className="fixed inset-0 overflow-hidden bg-black text-star">
      {vinculado && <div className="absolute inset-0 grid place-items-center overflow-hidden">
        <div className="relative overflow-hidden bg-black" style={{ width: `min(100vw, ${proporcaoVideo * 100}svh)`, aspectRatio: proporcaoVideo }}>
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
          {!ligada && <div className="absolute inset-0 grid place-items-center text-center text-sm text-mist/70">
            <div><p>Prévia indisponível</p><button type="button" onClick={() => void ativar()} className="mt-3 rounded-xl border border-gold/50 bg-black/75 px-4 py-2 text-gold">Tentar abrir câmera</button></div>
          </div>}
        </div>
      </div>}

      {secao === 'camera' && vinculado && <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/65 via-transparent to-black/70" />}

      <button type="button" aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menuAberto}
        onClick={() => setMenuAberto((aberto) => !aberto)}
        className="absolute left-[max(12px,env(safe-area-inset-left))] top-[max(12px,env(safe-area-inset-top))] z-50 grid h-11 w-11 place-items-center rounded-xl border border-white/25 bg-black/75 text-xl shadow-lg">
        {menuAberto ? '×' : '☰'}
      </button>

      {secao === 'camera' && vinculado && <button type="button" aria-label={transmitindo ? 'Parar transmissão para o site' : 'Iniciar transmissão para o site'} aria-pressed={transmitindo}
        title={!ligada ? 'A câmera ainda não está pronta' : !mesaAtual ? 'Abra uma mesa no computador para transmitir' : transmitindo ? 'Parar transmissão' : 'Iniciar transmissão'}
        disabled={!ligada || !mesaAtual}
        onClick={alternarTransmissao}
        className="absolute right-[max(12px,env(safe-area-inset-right))] top-[max(12px,env(safe-area-inset-top))] z-20 grid h-12 w-12 place-items-center rounded-full border border-white/30 bg-black/80 shadow-lg disabled:cursor-not-allowed">
        <span className={'h-5 w-5 rounded-full border-2 border-white/50 transition-all ' + (transmitindo ? 'bg-emerald-400 shadow-[0_0_18px_#4ade80,0_0_6px_#4ade80]' : 'bg-red-500 shadow-[0_0_14px_#ef4444]')} />
      </button>}
      {secao === 'camera' && vinculado && <div className="absolute bottom-[max(12px,env(safe-area-inset-bottom))] right-[max(12px,env(safe-area-inset-right))] z-20 flex items-center gap-2">
        <button type="button" aria-label={mudo ? 'Ativar microfone' : 'Silenciar microfone'} aria-pressed={mudo} title={temMicrofone ? (mudo ? 'Ativar microfone' : 'Silenciar microfone') : 'Microfone indisponível'}
          disabled={!ligada || !temMicrofone}
          onClick={() => { const proximo = !mudo; stream.current?.getAudioTracks().forEach((t) => { t.enabled = !proximo }); setMudo(proximo) }}
          className={'grid h-12 w-12 place-items-center rounded-xl border bg-black/80 shadow-lg disabled:opacity-45 ' + (mudo ? 'border-red-400/70 text-red-300' : 'border-white/30 text-star')}>
          <IconeMicrofone mudo={mudo} />
        </button>
        <button type="button" aria-label={guiasAtivas ? 'Desabilitar posições' : 'Habilitar posições'} aria-pressed={guiasAtivas} title={mesaAtual ? (guiasAtivas ? 'Desabilitar posições' : 'Habilitar posições') : 'Abra uma mesa para habilitar posições'}
          disabled={!mesaAtual}
          onClick={() => void alternarGuias()}
          className={'grid h-12 w-12 place-items-center rounded-xl border transition-all disabled:opacity-45 ' + (guiasAtivas ? 'translate-y-px border-gold bg-gold/25 text-gold shadow-[inset_0_2px_8px_#0009,0_0_16px_#f4d48988]' : 'border-white/30 bg-black/80 text-star shadow-lg')}>
          <IconePosicoes />
        </button>
      </div>}
      {secao === 'camera' && vinculado && <div className="absolute right-3 top-[max(68px,calc(env(safe-area-inset-top)+68px))] z-20 max-w-[min(60vw,300px)] rounded-xl bg-black/70 px-3 py-2 text-right text-xs text-mist">
        <p role="status">{!ligada ? estado : !mesaAtual ? 'Prévia ativa · abra uma mesa no computador' : transmitindo || /^(Falha|Conexão interrompida|Não foi possível enviar)/.test(estado) ? estado : 'Prévia ativa · transmissão pausada'}</p>
        {ligada && !telaHorizontal && <p role="alert" className="mt-1 text-gold">Gire o celular e ative a Rotação automática se a tela não acompanhar.</p>}
        {mesaAtual && <p className="mt-1 text-gold">{spread?.nome ?? 'Layout'} · posições da mesa</p>}
      </div>}

      {!vinculado && <div className="absolute inset-0 z-20 grid place-items-center overflow-y-auto bg-void p-5">
        <section className="w-full max-w-md rounded-2xl border border-gold/25 bg-white/[0.04] p-5">
          <h1 className="font-display text-xl">Vincular este celular</h1>
          <p className="mt-2 text-sm leading-relaxed text-mist">No computador, abra Perfil → Câmera do celular e gere um código. Digite os 8 números aqui. O código expira em 10 minutos.</p>
          {!dispositivoId && <p className="mt-3 text-sm text-rose">Ative o armazenamento deste navegador para vincular o aparelho.</p>}
          <form onSubmit={(e) => void vincular(e)} className="mt-5 flex gap-2">
            <input type="text" inputMode="numeric" pattern="[0-9]{8}" maxLength={8} required value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))} aria-label="Código de vinculação" placeholder="00000000" className="min-w-0 flex-1 rounded-xl border border-white/20 bg-black/40 px-3 py-3 text-center font-mono text-xl tracking-[0.2em] outline-none focus:border-gold" />
            <button type="submit" disabled={!dispositivoId || codigo.length !== 8} className="rounded-xl bg-gold px-4 font-semibold text-void disabled:opacity-40">Vincular</button>
          </form>
          <p role="status" className="mt-3 text-sm text-mist">{estado}</p>
        </section>
      </div>}

      {secao !== 'camera' && <section className="absolute inset-0 z-30 overflow-y-auto bg-void px-5 pb-8 pt-20">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs uppercase tracking-[0.2em] text-gold">DigiTarot</p>
          <h1 className="mb-5 mt-1 font-display text-2xl">{secoes.find((item) => item.id === secao)?.titulo}</h1>
          {secao === 'geral' && <GeralCamera />}
          {secao === 'tiragem' && <TiragensCamera />}
          {secao === 'carta' && <MinhaCartaCamera />}
        </div>
      </section>}

      {menuAberto && <>
        <button type="button" aria-label="Fechar menu" onClick={() => setMenuAberto(false)} className="absolute inset-0 z-40 bg-black/65" />
        <nav aria-label="Menu do aplicativo" className="absolute inset-y-0 left-0 z-40 w-[min(320px,85vw)] overflow-y-auto border-r border-gold/20 bg-[#171020] pb-6 pl-[max(16px,env(safe-area-inset-left))] pr-4 pt-20 shadow-2xl">
          <p className="px-3 text-xs uppercase tracking-[0.2em] text-gold">DigiTarot</p>
          <p className="mb-6 mt-1 truncate px-3 text-sm text-mist">{usuario.nome}</p>
          <ul className="space-y-2">{secoes.map((item) => <li key={item.id}><button type="button" onClick={() => escolher(item.id)} aria-current={secao === item.id ? 'page' : undefined}
            className={'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm ' + (secao === item.id ? 'bg-gold/15 text-gold' : 'text-star hover:bg-white/10')}><span aria-hidden>{item.icone}</span>{item.titulo}</button></li>)}</ul>
          <button type="button" onClick={() => { parar(); void sair() }} className="mt-8 w-full rounded-xl border border-white/20 px-3 py-3 text-left text-sm text-mist">Sair</button>
          {instalar?.prompt && <button type="button" onClick={() => { void instalar.prompt?.(); setInstalar(null) }} className="mt-3 w-full rounded-xl border border-gold/40 px-3 py-3 text-left text-sm text-gold">Instalar aplicativo</button>}
          {atualizacaoDisponivel && <p className="mt-4 px-3 text-xs text-gold">Nova versão disponível. Ela será aplicada após parar a transmissão.</p>}
        </nav>
      </>}
    </main>
  )
}
