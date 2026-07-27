import Image from 'next/image';

interface Props {
  locale: string;
}

const testimonialsNl = [
  {
    quote: 'OpenTour heeft onze toernooien volledig getransformeerd. Wat eerder uren Excel-beheer kostte, is nu in minuten geregeld. De live scoring is een game-changer voor deelnemers.',
    name: 'Mark de Vries',
    role: 'Wedstrijdsecretaris, Golfclub De Eemnes',
    avatar: '/profile_page_maleEDIT.jpg',
  },
];

const testimonialsEn = [
  {
    quote: 'OpenTour has completely transformed our tournaments. What used to take hours of Excel management is now handled in minutes. The live scoring is a game-changer for participants.',
    name: 'Mark de Vries',
    role: 'Competition Secretary, Golfclub De Eemnes',
    avatar: '/profile_page_maleEDIT.jpg',
  },
];

export function TestimonialsSection({ locale }: Props) {
  const testimonials = locale === 'nl' ? testimonialsNl : testimonialsEn;

  return (
    <section id="testimonials" className="py-20 bg-surface-2/50">
      <div className="max-w-admin mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-14">
          <p className="text-label text-content-muted mb-3 tracking-section">
            {locale === 'nl' ? 'GETUIGENISSEN' : 'TESTIMONIALS'}
          </p>
          <h2 className="text-heading font-serif text-content">
            {locale === 'nl' ? 'Wat gebruikers zeggen' : 'What users say'}
          </h2>
        </div>

        {/* Testimonial cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {testimonials.map((item, i) => (
            <div
              key={i}
              className="bg-surface border border-border rounded-card p-8 relative"
            >
              {/* Quote mark */}
              <div className="absolute top-6 right-8 text-brand-primary/20 text-6xl font-serif leading-none select-none">
                "
              </div>

              {/* Quote */}
              <p className="text-body text-content leading-relaxed mb-8 relative z-10">
                {item.quote}
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-3 border border-border">
                  <Image
                    src={item.avatar}
                    alt={item.name}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-content">{item.name}</p>
                  <p className="text-xs text-content-muted">{item.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
