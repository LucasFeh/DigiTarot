import { motion } from 'framer-motion'

const STEPS = [
  {
    icon: '🃏',
    title: 'Escolha a carta',
    text: 'Pergunta avulsa, leitura temática, consulta por tempo ou uma tiragem especial.',
  },
  {
    icon: '✉️',
    title: 'Envie sua pergunta',
    text: 'Você manda o contexto e o que quer saber. Quanto mais direta a pergunta, mais direta a resposta.',
  },
  {
    icon: '🔮',
    title: 'Receba a leitura',
    text: 'A tiragem chega em até 48h, por escrito ou em áudio, com as cartas e a interpretação.',
  },
]

export default function HowItWorks() {
  return (
    <section className="relative px-5 py-16 sm:py-20">
      <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-3">
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
