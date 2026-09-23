import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../lib/useAuth'
import { criarPeer, oferecer, receberResposta } from '../lib/webrtc'
import type { SinalMidia } from '../lib/backend'

/** A página do QR não lê a sessão: o token aleatório dá acesso só ao pareamento. */
export default function CameraCelularPage({ sessaoId, token }: { sessaoId: string; token: string }) {
  const { backend } = useAuth()
  const [sinal, setSinal] = useState<SinalMidia | null>(null)
  const [ativo, setAtivo] = useState(false)
  const [parando, setParando] = useState(false)
  const [estado, setEstado] = useState('Abra a câmera quando estiver pronto para mostrar a mesa.')
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const peer = useRef<RTCPeerConnection | null>(null)
  const iniciando = useRef(false)

  const parar = useCallback(async (avisarSala = true) => {
    setParando(true)
    peer.current?.close()
    peer.current = null
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
    if (video.current) video.current.srcObject = null
    setAtivo(false)
    setEstado('Transmissão parada. Você pode iniciá-la novamente.')
    if (avisarSala && backend) await backend.salvarSinal(sessaoId, token, { oferta: '' }).catch(() => {})
    setParando(false)
  }, [backend, sessaoId, token])

  useEffect(() => {
    if (!backend) return
    return backend.observarSinal(sessaoId, token, (proximo) => {
      setSinal(proximo)
      if (proximo?.resposta === 'encerrar' && (peer.current || stream.current)) {
        void parar(false)
        setEstado('O tarólogo encerrou esta leitura. A câmera foi desligada.')
      }
    })
  }, [backend, sessaoId, token, parar])

  useEffect(() => {
    if (sinal?.resposta === 'encerrar') return
    if (!sinal?.resposta || !peer.current) return
    void receberResposta(peer.current, sinal.resposta).then(() => setEstado('Câmera conectada à sala.')).catch(() => setEstado('A conexão falhou. Tente iniciar de novo.'))
  }, [sinal?.resposta])

  useEffect(() => () => {
    peer.current?.close()
    stream.current?.getTracks().forEach((t) => t.stop())
  }, [])

  const iniciar = async () => {
    if (iniciando.current || ativo || parando) return
    if (sinal?.resposta === 'encerrar') {
      setEstado('Esta leitura foi encerrada pelo tarólogo.')
      return
    }
    if (!backend || !sinal || !sinal.expiraEm || Date.now() >= sinal.expiraEm) {
      setEstado('Este QR expirou. Gere outro na sala do tarólogo.')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
      setEstado('Abra este link em HTTPS em um navegador com acesso à câmera.')
      return
    }
    iniciando.current = true
    try {
      setEstado('Pedindo permissão para a câmera…')
      const capturada = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      stream.current = capturada
      if (video.current) video.current.srcObject = capturada
      const conexao = criarPeer()
      peer.current = conexao
      const controle = conexao.createDataChannel('controle')
      controle.onmessage = (evento) => {
        if (evento.data !== 'encerrar') return
        void parar(false)
        setEstado('O tarólogo encerrou esta leitura. A câmera foi desligada.')
      }
      capturada.getVideoTracks().forEach((t) => conexao.addTrack(t, capturada))
      conexao.onconnectionstatechange = () => {
        if (conexao.connectionState === 'connected') setEstado('Câmera conectada à sala.')
        if (conexao.connectionState === 'disconnected') setEstado('Conexão interrompida. Confira a rede ou gere outro QR.')
        if (conexao.connectionState === 'failed') setEstado('A rede impediu a conexão. Tente novamente em outra rede.')
      }
      const oferta = await oferecer(conexao)
      await backend.salvarSinal(sessaoId, token, { oferta })
      setAtivo(true)
      setEstado('Aguardando a sala receber a câmera…')
    } catch {
      await parar()
      setEstado('Não foi possível iniciar. Confira a permissão da câmera e a conexão.')
    } finally {
      iniciando.current = false
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-xl flex-col justify-center gap-5 px-5 py-8 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-gold">DigiTarot · câmera da mesa</p>
      <h1 className="font-display text-3xl text-star">Seu celular vira a câmera</h1>
      <p className="text-mist/80">Posicione o celular acima das cartas. Esta página precisa ficar aberta durante a tiragem.</p>
      <video ref={video} autoPlay muted playsInline className="max-h-[65svh] w-full rounded-2xl border border-white/15 bg-black object-contain" />
      <p role="status" className="text-sm text-mist">{estado}</p>
      {sinal?.resposta === 'encerrar' ? null : ativo ? (
        <button type="button" onClick={() => void parar()} className="rounded-full border border-rose/50 px-6 py-3 text-rose">Parar câmera</button>
      ) : (
        <button type="button" disabled={parando} onClick={() => void iniciar()} className="rounded-full bg-gold px-6 py-3 font-semibold text-void disabled:opacity-50">{parando ? 'Parando câmera…' : 'Iniciar câmera'}</button>
      )}
      <p className="text-xs text-mist/50">A imagem vai para a sala em tempo real. Este link de conexão expira em 10 minutos.</p>
    </main>
  )
}
