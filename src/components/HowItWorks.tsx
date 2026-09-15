import { motion } from 'framer-motion'

/**
 * Os passos reais da contratação, na ordem em que acontecem. Precisa continuar
 * batendo com o que as telas fazem: esta é a única explicação que a pessoa lê
 * antes de decidir, e uma promessa a mais aqui é uma decepção depois.
 */
const STEPS = [
  {
    icon: '✦',
    title: 'Escolha a consulta',
    text: 'Pergunta avulsa, leitura temática, consulta por tempo ou uma tiragem especial.',
  },
  {
    icon: '☾',
    title: 'Marque dia e horário',
    text: 'Atendimento todos os dias, das 16h às 21h. Você escolhe o encaixe na agenda.',
  },
  {
    icon: '❖',
    title: 'Pague pelo Pix',
    text: 'QR Code na hora, com o valor já preenchido. A consulta é confirmada assim que o pagamento é identificado.',
  },
  {
    icon: '◈',
    title: 'Entre na sua mesa',
    text: 'No horário marcado abre uma sala só sua, e as cartas aparecem ao vivo conforme vão para a mesa.',
  },
]

export default function HowItWorks() {
  return (
    <section className="relative px-5 py-16 sm:py-20">
      <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, delay: i * 0.1 }}
            className="glass relative overflow-hidden rounded-2xl p-6 text-center"
          >
            <span
              aria-hidden
              className="absolute right-4 top-3 font-display text-5xl font-bold text-white/5"
            >
              {i + 1}
            </span>
            <span className="text-3xl" aria-hidden>
              {s.icon}
            </span>
            <h3 className="mt-3 font-display text-lg text-star">{s.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-mist/85">{s.text}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
