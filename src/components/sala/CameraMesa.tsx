import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { Backend, Sessao, SinalMidia } from '../../lib/backend'
import { novoToken } from '../../lib/backend/local'
import { criarPeer, oferecer, receberResposta, responder } from '../../lib/webrtc'
import { limitarQuadro, redimensionarQuadro, type DirecaoAjuste, type QuadroCamera } from '../../lib/posicaoCamera'

const ALCAS: { direcao: DirecaoAjuste; posicao: string; cursor: string }[] = [
  { direcao: 'nw', posicao: 'left-1 top-1', cursor: 'cursor-nwse-resize' },
  { direcao: 'n', posicao: 'left-1/2 top-1 -translate-x-1/2', cursor: 'cursor-ns-resize' },
  { direcao: 'ne', posicao: 'right-1 top-1', cursor: 'cursor-nesw-resize' },
  { direcao: 'e', posicao: 'right-1 top-1/2 -translate-y-1/2', cursor: 'cursor-ew-resize' },
  { direcao: 'se', posicao: 'bottom-1 right-1', cursor: 'cursor-nwse-resize' },
  { direcao: 's', posicao: 'bottom-1 left-1/2 -translate-x-1/2', cursor: 'cursor-ns-resize' },
  { direcao: 'sw', posicao: 'bottom-1 left-1', cursor: 'cursor-nesw-resize' },
  { direcao: 'w', posicao: 'left-1 top-1/2 -translate-y-1/2', cursor: 'cursor-ew-resize' },
]

export type CameraMesaHandle = { conectar: () => void; encerrar: () => Promise<void> }

export default function CameraMesa({ backend, sessao, ehTarologo, cameraRef, onConexao }: {
  backend: Backend
  sessao: Sessao
  ehTarologo: boolean
  cameraRef?: React.Ref<CameraMesaHandle>
  onConexao?: (conectada: boolean) => void
}) {
  const [token, setToken] = useState<string | null>(null)
  const [qrAberto, setQrAberto] = useState(false)
  const [erro, setErro] = useState('')
  const [cameraSinal, setCameraSinal] = useState<SinalMidia | null>(null)
  const [videoSinal, setVideoSinal] = useState<SinalMidia | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [recebido, setRecebido] = useState<MediaStream | null>(null)
  const [posicaoLocal, setPosicaoLocal] = useState<{ x: number; y: number } | null>(null)
  const [tamanhoLocal, setTamanhoLocal] = useState<number | null>(null)
  const [proporcao, setProporcao] = useState(16 / 9)
  const [salaTamanho, setSalaTamanho] = useState({ largura: 0, altura: 0 })
  const cameraPc = useRef<RTCPeerConnection | null>(null)
  const canalControle = useRef<RTCDataChannel | null>(null)
  const videoPc = useRef<RTCPeerConnection | null>(null)
  const videoEl = useRef<HTMLVideoElement>(null)
  const arrastando = useRef<{ dx: number; dy: number; ultimo: { x: number; y: number } | null } | null>(null)
  const redimensionando = useRef<{ x: number; y: number; direcao: DirecaoAjuste; area: { largura: number; altura: number }; inicial: QuadroCamera; ultimo: QuadroCamera } | null>(null)
  const processada = useRef('')
  const processadoVideo = useRef('')
  const teveStream = useRef(false)
  const pos = sessao.cameraPosicao ?? { x: 58, y: 20 }
  const posicao = posicaoLocal ?? pos
  const cameraAtiva = ehTarologo ? stream : recebido
  const visivel = sessao.cameraVisivel !== false
  const tamanho = tamanhoLocal ?? sessao.cameraTamanho ?? 34
  const quadro = limitarQuadro({ ...posicao, largura: tamanho }, salaTamanho, proporcao)

  useEffect(() => {
    if (!cameraAtiva || !visivel || !videoEl.current) return
    const sala = videoEl.current.parentElement?.parentElement
    if (!sala) return
    const observar = new ResizeObserver(() => setSalaTamanho({ largura: sala.clientWidth, altura: sala.clientHeight }))
    observar.observe(sala)
    return () => observar.disconnect()
  }, [cameraAtiva, visivel])

  useEffect(() => { onConexao?.(Boolean(stream)) }, [onConexao, stream])

  useEffect(() => {
    if (!token || !ehTarologo) return
    return backend.observarSinal(sessao.id, `camera-${token}`, (s) => {
      setCameraSinal(s)
      if (s && !s.oferta) {
        cameraPc.current?.close()
        cameraPc.current = null
        canalControle.current = null
        processada.current = ''
        setStream(null)
      }
    })
  }, [backend, sessao.id, token, ehTarologo])

  useEffect(() => backend.observarSinal(sessao.id, 'video', (s) => {
    setVideoSinal(s)
    if (!ehTarologo && s && !s.oferta) {
      videoPc.current?.close()
      videoPc.current = null
      processadoVideo.current = ''
      setRecebido(null)
    }
  }), [backend, sessao.id, ehTarologo])

  useEffect(() => {
    if (!ehTarologo || !cameraSinal?.oferta || !token || cameraSinal.oferta === processada.current) return
    processada.current = cameraSinal.oferta
    cameraPc.current?.close()
    const pc = criarPeer()
    cameraPc.current = pc
    pc.ondatachannel = (e) => { canalControle.current = e.channel }
    pc.ontrack = (e) => {
      const proximo = e.streams[0] ?? new MediaStream([e.track])
      setStream(proximo)
      e.track.onended = () => { if (cameraPc.current === pc) setStream(null) }
    }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' && cameraPc.current === pc) setStream(null)
    }
    void responder(pc, cameraSinal.oferta)
      .then((resposta) => backend.salvarSinal(sessao.id, `camera-${token}`, { resposta }))
      .catch(() => setErro('Não foi possível receber a câmera do celular. Gere outro QR.'))
  }, [backend, sessao.id, ehTarologo, cameraSinal?.oferta, token])

  // O computador do tarólogo recebe o celular e retransmite a mesma faixa ao
  // cliente. O token do QR nunca aparece no documento que o cliente lê.
  useEffect(() => {
    if (!ehTarologo || !stream) return
    teveStream.current = true
    videoPc.current?.close()
    const pc = criarPeer()
    videoPc.current = pc
    stream.getVideoTracks().forEach((t) => pc.addTrack(t, stream))
    const versao = novoToken()
    void oferecer(pc)
      .then((oferta) => backend.salvarSinal(sessao.id, 'video', { tipo: 'video', versao, oferta, resposta: '' }))
      .catch(() => setErro('Não foi possível mostrar a câmera ao cliente.'))
    return () => { pc.close() }
  }, [backend, sessao.id, ehTarologo, stream])

  useEffect(() => {
    if (ehTarologo && !stream && teveStream.current) {
      teveStream.current = false
      void backend.salvarSinal(sessao.id, 'video', { oferta: '', resposta: '' }).catch(() => {})
    }
  }, [backend, sessao.id, ehTarologo, stream])

  useEffect(() => {
    if (!ehTarologo || !videoSinal?.resposta || !videoPc.current) return
    void receberResposta(videoPc.current, videoSinal.resposta).catch(() => setErro('A conexão de vídeo falhou.'))
  }, [ehTarologo, videoSinal?.resposta])

  useEffect(() => {
    if (ehTarologo || !videoSinal?.oferta || videoSinal.oferta === processadoVideo.current) return
    processadoVideo.current = videoSinal.oferta
    videoPc.current?.close()
    const pc = criarPeer()
    videoPc.current = pc
    pc.ontrack = (e) => {
      setRecebido(e.streams[0] ?? new MediaStream([e.track]))
      e.track.onended = () => { if (videoPc.current === pc) setRecebido(null) }
    }
    void responder(pc, videoSinal.oferta)
      .then((resposta) => backend.salvarSinal(sessao.id, 'video', { resposta }))
      .catch(() => setErro('Não foi possível abrir o vídeo da mesa.'))
  }, [backend, sessao.id, ehTarologo, videoSinal?.oferta])

  useEffect(() => {
    if (videoEl.current) videoEl.current.srcObject = cameraAtiva
  }, [cameraAtiva, sessao.cameraModo, visivel])

  useEffect(() => () => {
    cameraPc.current?.close()
    videoPc.current?.close()
  }, [])

  const gerarQr = async () => {
    const novo = novoToken()
    try {
      await backend.salvarSinal(sessao.id, `camera-${novo}`, {
        tipo: 'camera', versao: novo, expiraEm: Date.now() + 10 * 60 * 1000, oferta: '', resposta: '',
      })
      cameraPc.current?.close()
      cameraPc.current = null
      canalControle.current = null
      processada.current = ''
      setStream(null)
      setToken(novo)
      setQrAberto(true)
      setErro('')
      await backend.atualizarSessao(sessao.id, { cameraVisivel: true, cameraModo: 'sobreposta' })
    } catch {
      setErro('Não foi possível gerar o QR. Confira as regras de acesso do Firebase.')
    }
  }

  useImperativeHandle(cameraRef, () => ({
    conectar: () => {
      if (!stream) { void gerarQr(); return }
      void backend.atualizarSessao(sessao.id, { cameraVisivel: !visivel })
        .catch(() => setErro('Não foi possível alterar a visualização da câmera.'))
    },
    encerrar: async () => {
      if (canalControle.current?.readyState === 'open') canalControle.current.send('encerrar')
      if (token) {
        await backend.salvarSinal(sessao.id, `camera-${token}`, { resposta: 'encerrar' }).catch(() => {})
      }
    },
  }))

  const url = token ? `${window.location.origin}${window.location.pathname}#/camera/${sessao.id}/camera-${token}` : ''
  const modo = sessao.cameraModo ?? 'sobreposta'
  const alternarModo = () => void backend.atualizarSessao(sessao.id, {
    cameraModo: modo === 'camera' ? 'sobreposta' : 'camera',
  }).catch(() => setErro('Não foi possível trocar a visualização.'))

  const iniciarRedimensionamento = (e: React.PointerEvent<HTMLButtonElement>, direcao: DirecaoAjuste) => {
    e.stopPropagation()
    const sala = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect()
    if (!sala) return
    const area = { largura: sala.width, altura: sala.height }
    const inicial = limitarQuadro({ ...posicao, largura: tamanho }, area, proporcao)
    redimensionando.current = { x: e.clientX, y: e.clientY, direcao, area, inicial, ultimo: inicial }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const moverRedimensionamento = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    const gesto = redimensionando.current
    if (!gesto) return
    gesto.ultimo = redimensionarQuadro(gesto.inicial, gesto.direcao, e.clientX - gesto.x, e.clientY - gesto.y, gesto.area, proporcao)
    setPosicaoLocal({ x: gesto.ultimo.x, y: gesto.ultimo.y })
    setTamanhoLocal(gesto.ultimo.largura)
  }

  const terminarRedimensionamento = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    const gesto = redimensionando.current
    if (!gesto) return
    redimensionando.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
    void backend.atualizarSessao(sessao.id, {
      cameraPosicao: { x: gesto.ultimo.x, y: gesto.ultimo.y },
      cameraTamanho: gesto.ultimo.largura,
    }).catch(() => setErro('Não foi possível salvar o tamanho da câmera.'))
  }

  return (
    <>
      {cameraAtiva && visivel && (
        <div
          className={`absolute z-20 overflow-hidden border border-gold/50 bg-black shadow-2xl ${modo === 'camera' ? 'inset-0' : 'rounded-2xl'}`}
          style={modo === 'camera' ? undefined : { left: `${quadro.x}%`, top: `${quadro.y}%`, width: `${quadro.largura}%`, aspectRatio: proporcao, touchAction: ehTarologo ? 'none' : undefined }}
          onPointerDown={ehTarologo && modo === 'sobreposta' ? (e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            arrastando.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top, ultimo: null }
            e.currentTarget.setPointerCapture(e.pointerId)
          } : undefined}
          onPointerMove={ehTarologo && modo === 'sobreposta' ? (e) => {
            const deslocamento = arrastando.current
            const caixa = e.currentTarget.parentElement?.getBoundingClientRect()
            if (!deslocamento || !caixa) return
            const maxX = (caixa.width - e.currentTarget.offsetWidth) / caixa.width * 100
            const maxY = (caixa.height - e.currentTarget.offsetHeight) / caixa.height * 100
            const proxima = {
              x: Math.max(0, Math.min(maxX, (e.clientX - deslocamento.dx - caixa.left) / caixa.width * 100)),
              y: Math.max(0, Math.min(maxY, (e.clientY - deslocamento.dy - caixa.top) / caixa.height * 100)),
            }
            deslocamento.ultimo = proxima
            setPosicaoLocal(proxima)
          } : undefined}
          onPointerUp={ehTarologo && modo === 'sobreposta' ? (e) => {
            const ultimo = arrastando.current?.ultimo
            if (!arrastando.current) return
            arrastando.current = null
            if (ultimo) void backend.atualizarSessao(sessao.id, { cameraPosicao: ultimo })
            e.currentTarget.releasePointerCapture(e.pointerId)
          } : undefined}
          onPointerCancel={() => { arrastando.current = null; setPosicaoLocal(null) }}
        >
          <video
            ref={videoEl}
            autoPlay muted playsInline
            onLoadedMetadata={(e) => {
              const { videoWidth, videoHeight } = e.currentTarget
              if (videoWidth && videoHeight) setProporcao(videoWidth / videoHeight)
            }}
            className="absolute inset-0 h-full w-full object-contain"
          />
          {ehTarologo && modo === 'sobreposta' && <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-1 text-[11px] text-white">Arraste para mover</span>}
          {ehTarologo && <div className="absolute left-2 top-2 flex flex-wrap gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
            <button type="button" onClick={alternarModo} className="rounded-full border border-gold/50 bg-black/80 px-3 py-1.5 text-xs text-gold">{modo === 'camera' ? 'Voltar à mesa 3D' : 'Ver só câmera'}</button>
            <button type="button" onClick={() => void gerarQr()} className="rounded-full border border-white/30 bg-black/80 px-3 py-1.5 text-xs text-white">Trocar celular</button>
          </div>}
          {ehTarologo && modo === 'sobreposta' && <div className="absolute bottom-2 right-9 flex items-end gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
            <button type="button" aria-label="Diminuir câmera" onClick={() => {
              const novo = Math.max(18, tamanho - 8)
              setTamanhoLocal(novo)
              void backend.atualizarSessao(sessao.id, { cameraTamanho: novo })
            }} className="rounded-full bg-black/80 px-2.5 py-1 text-lg leading-none text-white">−</button>
            <button type="button" aria-label="Aumentar câmera" onClick={() => {
              const novo = Math.min(85, tamanho + 8)
              setTamanhoLocal(novo)
              void backend.atualizarSessao(sessao.id, { cameraTamanho: novo })
            }} className="rounded-full bg-black/80 px-2.5 py-1 text-lg leading-none text-white">+</button>
          </div>}
          {ehTarologo && modo === 'sobreposta' && ALCAS.map(({ direcao, posicao: alcaPosicao, cursor }) => (
            <button key={direcao} type="button" aria-label={`Redimensionar câmera pelo lado ${direcao}`} title="Arraste para redimensionar"
              className={`absolute z-10 h-4 w-4 rounded-full border-2 border-void bg-gold shadow-lg ${alcaPosicao} ${cursor}`}
              style={{ touchAction: 'none' }}
              onPointerDown={(e) => iniciarRedimensionamento(e, direcao)}
              onPointerMove={moverRedimensionamento}
              onPointerUp={terminarRedimensionamento}
              onPointerCancel={() => { redimensionando.current = null; setPosicaoLocal(null); setTamanhoLocal(null) }}
            />
          ))}
        </div>
      )}

      <div className="pointer-events-auto absolute left-3 top-16 z-30 flex max-w-[calc(100vw-1.5rem)] flex-wrap gap-2">
        {!ehTarologo && !cameraAtiva && videoSinal?.oferta && <span className="glass rounded-full px-3 py-1.5 text-xs text-mist">Conectando câmera…</span>}
        {erro && <span role="alert" className="glass rounded-xl px-3 py-2 text-xs text-rose">{erro}</span>}
      </div>

      {qrAberto && token && (
        <div role="dialog" aria-modal="true" aria-label="Conectar câmera do celular" className="fixed inset-0 z-[110] grid place-items-center bg-black/85 p-4">
          <div className="w-full max-w-md rounded-3xl border border-gold/30 bg-abyss p-6 text-center text-mist shadow-2xl">
            <h2 className="font-display text-2xl text-star">Câmera do celular</h2>
            <p className="my-3 text-sm">Escaneie com o celular, abra o link e permita usar a câmera. O QR expira em 10 minutos.</p>
            {backend.modo === 'local' && <p className="mb-3 rounded-xl border border-gold/30 p-2 text-xs text-gold">No teste local, o endereço 127.0.0.1 só funciona neste computador. No site publicado, o QR usa o endereço HTTPS.</p>}
            <div className="mx-auto w-fit rounded-xl bg-white p-3"><QRCodeSVG value={url} size={190} /></div>
            <a href={url} target="_blank" rel="noreferrer" className="mt-3 block break-all text-xs text-gold underline">Abrir link neste aparelho</a>
            <p className="mt-3 text-xs">Deixe esta sala aberta no computador durante a transmissão.</p>
            <button type="button" onClick={() => setQrAberto(false)} className="mt-5 rounded-full border border-white/25 px-6 py-2 text-star">{cameraAtiva ? 'Câmera conectada · fechar' : 'Fechar'}</button>
          </div>
        </div>
      )}
    </>
  )
}
