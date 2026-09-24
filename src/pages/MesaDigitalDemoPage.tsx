import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import demonstracaoMesa from '../assets/demonstracao-da-mesa.mp4'
import { useMobileLayout } from '../lib/useMobileLayout'

const VIDEOS = [
  {
    src: demonstracaoMesa,
    titulo: 'Demonstração na prática',
    descricao: 'Veja a mesa digital em uso, com as cartas sendo abertas e interpretadas durante a tiragem.',
    aria: 'Demonstração real da mesa digital do DigiTarot em funcionamento',
  },
  {
    src: `${import.meta.env.BASE_URL}mesa-digital-demo.mp4`,
    titulo: 'Prévia ilustrada',
    descricao: 'Uma visão rápida da chegada das cartas e da conversa pelo chat da mesa.',
    aria: 'Vídeo ilustrativo: três cartas aparecem na mesa digital e uma mensagem chega pelo chat',
  },
]

const PASSOS = [
  {
    numero: '01',
    titulo: 'A mesa se abre',
    texto: 'No horário combinado, o tarólogo abre uma sala reservada para sua consulta. Você entra pelo link da reserva.',
  },
  {
    numero: '02',
    titulo: 'As cartas aparecem ao vivo',
    texto: 'Cada carta colocada na mesa 3D aparece para você. O tarólogo pode virá-la e mostrar o significado durante a leitura.',
  },
  {
    numero: '03',
    titulo: 'Vocês conversam',
    texto: 'O chat permite enviar mensagens e imagens enquanto você acompanha a tiragem. O contato de voz é combinado com o profissional.',
  },
]

export default function MesaDigitalDemoPage() {
  const mobile = useMobileLayout()
  // No celular, a prévia curta abre primeiro. O vídeo completo continua no carrossel.
  const [videoAtivo, setVideoAtivo] = useState(mobile ? 1 : 0)
  const [direcao, setDirecao] = useState(1)

  function selecionarVideo(indice: number) {
    const destino = (indice + VIDEOS.length) % VIDEOS.length
    setDirecao(destino > videoAtivo || (videoAtivo === VIDEOS.length - 1 && destino === 0) ? 1 : -1)
    setVideoAtivo(destino)
  }

  const video = VIDEOS[videoAtivo]

  return (
    <main className="relative min-h-[calc(100vh-4rem)] bg-[#09070f] pb-24">
      <section className="mx-auto max-w-6xl px-5 pb-8 pt-14 sm:pt-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
          <p className="text-[12px] uppercase tracking-[0.3em] text-gold">DigiTarot · por dentro da experiência</p>
          <h1 className="mt-5 max-w-4xl font-display text-4xl leading-[1.12] text-star sm:text-6xl">
            Uma leitura que você acompanha carta por carta.
          </h1>
          <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-mist/80">
            Conheça a mesa digital antes de marcar. A prévia abaixo ilustra a chegada das cartas e a conversa durante o atendimento.
          </p>
        </motion.div>

        <div
          className="relative mt-11 overflow-hidden rounded-[24px] border border-gold/25 bg-[#130d20] shadow-[0_30px_80px_-40px_#8e64aa66]"
          aria-roledescription="carrossel"
          aria-label="Demonstrações da mesa digital"
          onKeyDown={(evento) => {
            if (evento.key === 'ArrowLeft') selecionarVideo(videoAtivo - 1)
            if (evento.key === 'ArrowRight') selecionarVideo(videoAtivo + 1)
          }}
        >
          <div className="relative aspect-video overflow-hidden bg-[#090612]">
            <AnimatePresence initial={false} custom={direcao} mode="popLayout">
              <motion.div
                key={video.src}
                custom={direcao}
                initial={{ opacity: 0, x: direcao * 80 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direcao * -80 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.16}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -55) selecionarVideo(videoAtivo + 1)
                  if (info.offset.x > 55) selecionarVideo(videoAtivo - 1)
                }}
                className="absolute inset-0 cursor-grab active:cursor-grabbing"
              >
                <video
                  src={video.src}
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                  preload="metadata"
                  aria-label={video.aria}
                  className="h-full w-full bg-[#090612] object-contain"
                >
                  Seu navegador não consegue reproduzir o vídeo de demonstração.
                </video>
              </motion.div>
            </AnimatePresence>

            <button
              type="button"
              onClick={() => selecionarVideo(videoAtivo - 1)}
              aria-label="Mostrar vídeo anterior"
              className="absolute left-3 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-[#0b0714]/80 text-xl text-star backdrop-blur-md transition hover:border-gold/60 hover:bg-[#1b1129] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:left-5"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => selecionarVideo(videoAtivo + 1)}
              aria-label="Mostrar próximo vídeo"
              className="absolute right-3 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-[#0b0714]/80 text-xl text-star backdrop-blur-md transition hover:border-gold/60 hover:bg-[#1b1129] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:right-5"
            >
              →
            </button>
          </div>

          <div className="flex flex-col gap-4 border-t border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div aria-live="polite">
              <p className="font-display text-lg text-star">{video.titulo}</p>
              <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-mist/65">{video.descricao}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2" role="tablist" aria-label="Escolher demonstração">
              {VIDEOS.map((item, indice) => (
                <button
                  key={item.titulo}
                  type="button"
                  role="tab"
                  aria-selected={indice === videoAtivo}
                  aria-label={`Abrir ${item.titulo}`}
                  onClick={() => selecionarVideo(indice)}
                  className={`h-2.5 rounded-full transition-all focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold ${
                    indice === videoAtivo ? 'w-9 bg-gold' : 'w-2.5 bg-white/30 hover:bg-white/55'
                  }`}
                />
              ))}
              <span className="ml-2 text-[12px] tabular-nums text-mist/55">{videoAtivo + 1} / {VIDEOS.length}</span>
            </div>
          </div>
        </div>
        <p className="mt-3 text-right text-[12px] text-mist/55">Arraste para o lado ou use as setas. As cartas e o tema da mesa podem variar.</p>
      </section>

      <section className="mx-auto max-w-6xl px-5 pt-14 sm:pt-20">
        <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:gap-20">
          <div>
            <p className="text-[12px] uppercase tracking-[0.25em] text-gold">Como acontece</p>
            <h2 className="mt-3 font-display text-3xl leading-tight text-star sm:text-4xl">A leitura se revela no seu tempo.</h2>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-mist/70">
              A mesa é um espaço compartilhado entre você e o tarólogo. Cada carta pode ser acompanhada no momento em que ela entra na tiragem.
            </p>
          </div>
          <ol className="border-t border-white/15">
            {PASSOS.map((passo) => (
              <li key={passo.numero} className="grid gap-4 border-b border-white/15 py-7 sm:grid-cols-[52px_1fr]">
                <span className="font-display text-lg text-gold">{passo.numero}</span>
                <div>
                  <h3 className="font-display text-xl text-star">{passo.titulo}</h3>
                  <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-mist/70">{passo.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-6xl px-5">
        <div className="flex flex-col items-start justify-between gap-6 rounded-[24px] border border-gold/30 bg-[#181120] p-7 sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="font-display text-2xl text-star sm:text-3xl">Pronto para escolher sua leitura?</h2>
            <p className="mt-2 max-w-xl text-[15px] text-mist/75">Escolha a modalidade e o tarólogo. Na etapa seguinte, selecione a mesa digital como formato.</p>
          </div>
          <a href="#/tarologos" className="shrink-0 rounded-xl bg-gold px-6 py-3 text-center text-[15px] font-semibold text-[#171020] transition hover:bg-[#ffe3a4]">
            Conhecer tarólogos →
          </a>
        </div>
        <p className="mt-5 text-[13px] leading-relaxed text-mist/55">
          O áudio por microfone dentro da mesa ainda está em desenvolvimento. Se a leitura incluir conversa por voz, combine a chamada com o tarólogo pelo contato da reserva.
        </p>
      </section>
    </main>
  )
}
