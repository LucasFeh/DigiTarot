import { motion } from 'framer-motion'

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

        <div className="mt-11 overflow-hidden rounded-[24px] border border-gold/25 bg-[#130d20] shadow-[0_30px_80px_-40px_#8e64aa66]">
          <video
            src={`${import.meta.env.BASE_URL}mesa-digital-demo.mp4`}
            autoPlay
            muted
            loop
            playsInline
            controls
            aria-label="Vídeo ilustrativo: três cartas aparecem na mesa digital e uma mensagem chega pelo chat"
            className="aspect-video w-full bg-[#090612] object-contain"
          >
            Seu navegador não consegue reproduzir o vídeo de demonstração.
          </video>
        </div>
        <p className="mt-3 text-right text-[12px] text-mist/55">Prévia ilustrativa; as cartas e o tema da mesa podem variar.</p>
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
