'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  BriefcaseBusiness,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileCheck2,
  Globe2,
  Headphones,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  MoveUpRight,
  IdCard,
  Phone,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react'
import {
  getPublicGallery,
  getPublicNews,
  getPublicServices,
} from '@/lib/api'
import { sanitizeHtml, toHtml } from '@/lib/html'

const whatsappMessage = encodeURIComponent('Hello PT Fasqindo Mandiri Bersama, I would like to get more information about your visa, stay permit and work permit services.')
const whatsappUrl = `https://wa.me/6285121331588?text=${whatsappMessage}`

const navItems = [
  ['Home', '#home'],
  ['About Us', '#about'],
  ['Services', '#services'],
  ['Process', '#process'],
  ['Gallery', '#gallery'],
  ['News', '#news'],
  ['Contact', '#contact'],
]

const newsItems = [
  { label: 'IMMIGRATION', date: '08.06.2026', title: 'Understanding your immigration journey in Indonesia', summary: 'A practical starting point for expatriates and companies preparing for their next move.', details: 'Learn how to prepare for visa, stay permit, and work permit processes in Indonesia. We explain the key stages, supporting documents, and how professional guidance can make the journey clearer.' },
  { label: 'COMPANY NEWS', date: '08.06.2026', title: 'Built around clarity, care, and reliable support.', summary: 'Meet the team behind PT Fasqindo Mandiri and our commitment to every client we serve.', details: 'PT Fasqindo Mandiri supports individuals and companies with structured immigration assistance, responsive communication, and practical guidance from consultation through completion.' },
  { label: 'WORK PERMIT', date: '08.06.2026', title: 'What to prepare before your first consultation', summary: 'Organizing the right information helps create a smoother and more focused process.', details: 'Bring your passport details, current immigration status, company information, intended role, and relevant supporting documents so our team can assess your next steps efficiently.' },
]

const services = [
  { icon: IdCard, title: 'Visa Services', text: 'Clear guidance and practical assistance for the right visa based on your purpose in Indonesia.', details: 'We help identify the most suitable visa route for your visit, investment, employment, or family needs. Our team supports document preparation, application coordination, and practical guidance through each stage.' },
  { icon: Globe2, title: 'Stay Permit', text: 'Support for ITAS, ITAP and other stay permit needs, from preparation through completion.', details: 'From ITAS and ITAP preparation to extensions and related administration, we help keep your stay permit process organized, clear, and aligned with the applicable immigration requirements.' },
  { icon: BriefcaseBusiness, title: 'Work Permit Process', text: 'Understand and navigate the administrative journey for foreign workers and sponsoring companies.', details: 'We coordinate the administrative journey for sponsoring companies and foreign workers, including manpower, immigration, and supporting documentation stages.' },
]

type ServiceCard = { id?: number; icon: LucideIcon; title: string; text: string; details: string; number: string }
type NewsCard = { id?: number; label: string; date: string; title: string; summary: string; details: string; image_url?: string }
type GalleryCard = { id?: number; src: string; span: string; caption: string; alt: string }

const serviceIconMap: Record<string, LucideIcon> = {
  IdCard,
  Globe2,
  BriefcaseBusiness,
  ShieldCheck,
  FileCheck2,
  UsersRound,
  Headphones,
  Sparkles,
  MessageCircle,
  Clock3,
}

const fallbackGallery: GalleryCard[] = [
  { src: '/images/gallery-office-team.png', span: 'TEAM ACTIVITIES', caption: 'Working together with purpose.', alt: 'Fasqindo team collaborating in the office' },
  { src: '/images/gallery-office-consultation.png', span: 'CLIENT CONSULTATION', caption: 'Clear guidance, face to face.', alt: 'Fasqindo consultant meeting with a client' },
  { src: '/images/gallery-office-atmosphere.png', span: 'OUR WORKSPACE', caption: 'A professional place to begin.', alt: 'Fasqindo office reception and workspace' },
]

const benefits = [
  ['Professional & Reliable', 'A dependable partner for every step of your immigration journey.', ShieldCheck],
  ['Clear Process', 'Transparent communication so you always know what comes next.', FileCheck2],
  ['Experienced Team', 'Practical knowledge shaped by years of supporting clients in Indonesia.', UsersRound],
  ['Responsive Support', 'Accessible guidance when you need answers or a progress update.', Headphones],
]

const processGroups = [
  { number: '01', name: 'KEMNAKER', description: 'The manpower stage for establishing and approving the company’s foreign worker employment plan.', icon: BriefcaseBusiness, image: '/images/KEMNAKER.png', steps: [
    ['RPTKA', 'Rencana Penggunaan Tenaga Kerja Asing', 'The company’s plan and requirements for employing foreign workers in Indonesia.'],
    ['HPK', 'Hasil Penilaian Kelayakan', 'Eligibility assessment results related to the proposed foreign worker employment plan.'],
    ['DKPTKA', 'Notifikasi & Pembayaran DKPTKA', 'Notification and payment of the foreign worker compensation fund according to applicable requirements.'],
    ['IMTA', 'Pengesahan RPTKA / IMTA', 'The completion and approval stage of the manpower process.'],
  ]},
  { number: '02', name: 'IMIGRASI', description: 'The immigration stage for securing the appropriate entry and limited stay authorization.', icon: Globe2, image: '/images/IMIGRASI.png', steps: [
    ['e-Visa', 'e-Visa Processing', 'Visa processing based on the applicable visa type and requirements.'],
    ['ITAS', 'Izin Tinggal Terbatas', 'The process for obtaining a limited stay permit for the foreign worker.'],
  ]},
  { number: '03', name: 'POLDA', description: 'The required police reporting and administrative process for foreign nationals, where applicable.', icon: ShieldCheck, image: '/images/POLDA.png', steps: [
    ['STM', 'Surat Tanda Melapor', 'Police reporting documentation completed according to the relevant requirements.'],
  ]},
  { number: '04', name: 'DUKCAPIL', description: 'The population administration stage for registering the foreign national’s residence.', icon: IdCard, image: '/images/DUKCAPIL.png', steps: [
    ['SKTT', 'Surat Keterangan Tempat Tinggal', 'Residence registration and documentation for foreign nationals according to applicable requirements.'],
  ]},
]

const companyClients = [
  ['/images/client-apparel-one.png', 'PT APPAREL ONE INDONESIA'],
  ['/images/client-airblast.png', 'PT Airblast Equipment Indonesia'],
  ['/images/client-sudestada.png', 'SUDESTADA RESTAURANT', 'PT Titian Agung Sejahtera'],
  ['/images/kothis.png', 'PT Kothis Jawa Indonesia'],
  ['/images/GH EMM.png', 'PT GH EMM Power Indonesia'],
]

const institutionalPartners = [
  ['/images/client-kemnaker.png', 'KEMNAKER'],
  ['/images/IMIGRASI.png', 'DIRJEN IMIGRASI'],
]

function RichText({ html, className }: { html: string; className?: string }) {
  return <div className={className ? `richtext ${className}` : 'richtext'} dangerouslySetInnerHTML={{ __html: sanitizeHtml(toHtml(html)) }} />
}

type PartnerItem = (string | null | undefined)[]

function PartnerMarquee({ items, className, ariaLabel, minItems = 4 }: { items: PartnerItem[]; className?: string; ariaLabel: string; minItems?: number }) {
  if (items.length === 0) return null
  const baseCount = Math.ceil(Math.max(items.length, minItems) / items.length) * items.length
  const base = Array.from({ length: baseCount }, (_, index) => items[index % items.length]!)
  const track = [...base, ...base]
  return (
    <div className={`partner-marquee${className ? ` ${className}` : ''}`} aria-label={ariaLabel}>
      <div className="partner-track">
        {track.map(([logo, name, detail], index) => (
          <div className="partner-card" key={`${name}-${index}`} aria-hidden={index >= base.length || undefined}>
            {logo ? <img className="partner-logo-image" src={logo} alt={`${name} logo`} /> : <span className="partner-logo-placeholder" aria-hidden="true">{name?.slice(0, 1) ?? '?'}</span>}
            <span className="partner-name"><strong>{name}</strong>{detail && <small>{detail}</small>}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Page() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeNav, setActiveNav] = useState('#home')
  const [serviceItems, setServiceItems] = useState<ServiceCard[]>(() => services.map((item, index) => ({ ...item, number: String(index + 1).padStart(2, '0') })))
  const [newsList, setNewsList] = useState<NewsCard[]>(newsItems)
  const [galleryList, setGalleryList] = useState<GalleryCard[]>(fallbackGallery)
  const [selectedService, setSelectedService] = useState<ServiceCard | null>(null)
  const [selectedNews, setSelectedNews] = useState<NewsCard | null>(null)
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([getPublicServices(), getPublicNews(), getPublicGallery()]).then(([servicesResult, newsResult, galleryResult]) => {
      if (cancelled) return
      if (servicesResult.status === 'fulfilled') {
        setServiceItems(servicesResult.value.map((item, index) => ({
          id: item.id,
          icon: serviceIconMap[item.icon] ?? Globe2,
          title: item.title,
          text: item.description,
          details: item.details,
          number: String(index + 1).padStart(2, '0'),
        })))
      }
      if (newsResult.status === 'fulfilled') {
        setNewsList(newsResult.value.map((item) => ({
          id: item.id,
          label: item.label,
          date: item.date,
          title: item.title,
          summary: item.summary,
          details: item.details,
          image_url: item.image_url || undefined,
        })))
      }
      if (galleryResult.status === 'fulfilled') {
        setGalleryList(galleryResult.value.map((item) => ({
          id: item.id,
          src: item.image_url,
          span: (item.category || item.title).toUpperCase(),
          caption: item.caption || item.title,
          alt: item.title,
        })))
      }
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const sections = navItems
      .map(([, href]) => document.querySelector<HTMLElement>(href))
      .filter((section): section is HTMLElement => section !== null)
    if (!sections.length) return

    const update = () => {
      const marker = window.innerHeight * 0.45
      let current = sections[0]!
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 6
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= marker) current = section
      }
      if (atBottom) current = sections[sections.length - 1]!
      setActiveNav(`#${current.id}`)
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  useEffect(() => {
    if (galleryIndex === null) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setGalleryIndex(null)
      if (event.key === 'ArrowRight') setGalleryIndex((index) => (index === null ? index : (index + 1) % galleryList.length))
      if (event.key === 'ArrowLeft') setGalleryIndex((index) => (index === null ? index : (index - 1 + galleryList.length) % galleryList.length))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [galleryIndex, galleryList.length])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const selector = [
      '.intro-grid > div',
      '.highlight-row .highlight',
      '.services-section .section-heading',
      '.service-grid .service-card',
      '.why-grid > div:first-child',
      '.benefit-grid .benefit',
      '.process-section .section-heading',
      '.process-groups .process-group',
      '.workflow-summary',
      '.process-bottom',
      '.cta-inner',
      '.gallery-section .section-heading',
      '.gallery-grid .gallery-card',
      '.news-section .section-heading',
      '.news-grid .news-feature',
      '.activity-section .section-heading',
      '.activity-layout .activity-photo',
      '.activity-copy > div',
      '.activity-gallery figure',
      '.contact-grid > div',
      '.site-footer .footer-grid > div',
    ].join(',')

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) entry.target.classList.add('is-visible')
        else entry.target.classList.remove('is-visible')
      }
    }, { threshold: 0, rootMargin: '0px 0px -12% 0px' })

    const arm = (node: HTMLElement) => {
      if (node.dataset.revealReady !== 'true') {
        node.dataset.revealReady = 'true'
        node.classList.add('reveal')
        if (/service-card|news-feature|gallery-card|activity-photo|benefit|highlight/.test(node.className)) node.classList.add('reveal-zoom')
        else if (node.matches('.intro-grid > div, .contact-grid > div')) {
          const order = Array.from(node.parentElement?.children ?? []).indexOf(node)
          node.classList.add(order === 0 ? 'reveal-left' : 'reveal-right')
        }
        const parent = node.parentElement
        if (parent) {
          const siblings = Array.from(parent.children).filter((child) => child.classList.contains('reveal'))
          const index = siblings.indexOf(node)
          node.style.setProperty('--reveal-delay', `${Math.min(Math.max(index, 0), 8) * 65}ms`)
        }
        const rect = node.getBoundingClientRect()
        const viewport = window.innerHeight || document.documentElement.clientHeight
        if (rect.top < viewport * 0.92 && rect.bottom > 0) node.classList.add('is-visible')
      }
      observer.observe(node)
    }

    let frame = 0
    const scan = () => document.querySelectorAll<HTMLElement>(selector).forEach(arm)
    const schedule = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => { frame = 0; scan() })
    }

    scan()
    window.addEventListener('load', scan, { once: true })

    const mutation = new MutationObserver(schedule)
    mutation.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      mutation.disconnect()
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('load', scan)
    }
  }, [])

  return (
    <main className="site-shell">
      <header className="site-header">
        <div className="container header-inner">
          <a href="#home" className="brand" onClick={() => setMenuOpen(false)} aria-label="PT Fasqindo Mandiri home">
            <img className="brand-logo" src="/images/fasqindo-logo-final.png" alt="PT. Fasqindo Mandiri Bersama" />
          </a>
          <nav className={`desktop-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Primary navigation">
            {navItems.map(([label, href]) => <a key={href} href={href} className={activeNav === href ? 'is-active' : undefined} onClick={() => { setMenuOpen(false); setActiveNav(href) }}>{label}</a>)}
            <a className="nav-cta" href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={16} /> Consult via WhatsApp</a>
          </nav>
          <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      <section id="home" className="hero-section">
        <Image src="/images/home.jpeg" alt="Fasqindo Mandiri professional consultant seated in his office" fill priority className="hero-image" sizes="45vw" />
        <div className="hero-overlay" />
        <div className="container hero-content">
          <p className="eyebrow light"><span /> IMMIGRATION & PERMIT SERVICES</p>
          <h1>Your trusted partner for <em>visa, stay permit</em> & work permit services in Indonesia.</h1>
          <p className="hero-lead">Professional assistance for expatriates and companies managing visa, stay permit, and work permit processes in Indonesia.</p>
          <div className="hero-actions">
            <a className="button button-accent" href={whatsappUrl} target="_blank" rel="noreferrer">Consult via WhatsApp <ArrowRight size={17} /></a>
            <a className="text-link light-link" href="#services">Explore our services <MoveUpRight size={16} /></a>
          </div>
          <div className="hero-proof"><span className="proof-icon"><ShieldCheck size={18} /></span><span><strong>Guidance you can rely on</strong><small>For individuals & companies in Indonesia</small></span></div>
        </div>
        <div className="hero-scroll">SCROLL TO EXPLORE <ChevronDown size={15} /></div>
      </section>

      <section id="about" className="section intro-section">
        <div className="container intro-grid">
          <div><p className="eyebrow">ABOUT FASQINDO</p><h2>Your trusted immigration & permit partner.</h2></div>
          <div><p className="body-large">PT Fasqindo Mandiri Bersama helps individuals and companies navigate visa, stay permit, and work permit processes in Indonesia with clarity, care, and professional guidance.</p><p className="body-copy">We are committed to providing the best service, fast processing, competitive prices, and fast response to ensure a smooth and hassle-free experience for every client.</p></div>
        </div>
        <div className="container highlight-row">
          {['Professional assistance', 'Experienced team', 'Clear process', 'Reliable service'].map((item, i) => <div className="highlight" key={item}><span>0{i + 1}</span><strong>{item}</strong></div>)}
        </div>
      </section>

      <section id="services" className="section services-section">
        <div className="container"><div className="section-heading"><div><p className="eyebrow">WHAT WE DO</p><h2>Services designed around <em>your needs.</em></h2></div><p>Whether you are an expatriate, investor, HR professional, or business owner, we make the process easier to understand and manage.</p></div>
          {serviceItems.length === 0 ? <p className="content-empty">Our services are being updated. Please check back soon.</p> : <div className="service-grid">{serviceItems.map((service, index) => { const { icon: Icon, title, text } = service; return <article className="service-card" key={service.id ?? `service-${index}`}><div className="card-top"><span className="service-icon"><Icon size={23} /></span></div><h3>{title}</h3><RichText html={text} className="card-summary" /><button className="card-link service-learn-more" type="button" onClick={() => setSelectedService(service)}>Learn more <ArrowRight size={15} /></button></article> })}</div>}
        </div>
      </section>

      <section className="section why-section"><div className="container why-grid"><div><p className="eyebrow">WHY FASQINDO</p><h2>Confidence in every <em>next step.</em></h2><p className="body-copy">Good advice starts with listening. We combine a professional approach with responsive support to help you move forward with confidence.</p><a className="button button-dark" href={whatsappUrl} target="_blank" rel="noreferrer">Talk to our team <ArrowRight size={16} /></a></div><div className="benefit-grid">{benefits.map(([title, text, Icon]) => <div className="benefit" key={title as string}><Icon size={22} /><div><h3>{title as string}</h3><p>{text as string}</p></div></div>)}</div></div></section>

      <section id="process" className="section process-section"><div className="container"><div className="section-heading"><div><p className="eyebrow">WORK PERMIT PROCESS</p><h2>A clear path, from <em>start to finish.</em></h2></div><p>From manpower approval to residence registration, we help you understand each stage of the foreign worker process in Indonesia.</p></div><div className="process-groups">{processGroups.map(({ number, name, description, icon: Icon, image }, groupIndex) => <article className="process-group" key={name}><div className="process-group-head"><span className="group-number">{number}</span><span className="group-icon">{image ? <img className="group-icon-image" src={image} alt={`${name} logo`} /> : <Icon size={20} />}</span><div><p className="eyebrow">{number} / PROCESS STAGE</p><h3>{name}</h3><p>{description}</p></div></div><div className="process-cards">{processGroups[groupIndex].steps.map(([shortName, title, text], stepIndex) => <div className="process-card" key={shortName}><div className="process-card-top"><span>{String(stepIndex + 1).padStart(2, '0')}</span><strong>{shortName}</strong></div><h4>{title}</h4><p>{text}</p></div>)}</div>{groupIndex < processGroups.length - 1 && <div className="process-connector" aria-hidden="true"><span>↓</span></div>}</article>)}</div><div className="workflow-summary"><p className="eyebrow">COMPLETE WORKFLOW</p><div className="workflow-track">{processGroups.flatMap((group) => group.steps.map(([shortName]) => shortName)).map((step, index, all) => <span key={step}><strong>{step}</strong>{index < all.length - 1 && <i>→</i>}</span>)}</div></div><div className="process-bottom"><div><p className="disclaimer">Process, requirements, documents, and processing times may vary depending on the applicant&apos;s circumstances and applicable government regulations.</p><p className="disclaimer">This website provides general information only and does not directly integrate with government systems.</p></div><div className="process-cta"><h3>Need Assistance With Your Work Permit Process?</h3><p>Our team can assist you in understanding and navigating the work permit, immigration, and supporting administrative processes in Indonesia.</p><a className="button button-dark" href={whatsappUrl} target="_blank" rel="noreferrer">Consult via WhatsApp <ArrowRight size={16} /></a></div></div></div></section>

      <section className="cta-section"><div className="container cta-inner"><div><p className="eyebrow light">LET&apos;S TALK</p><h2>Need help with your visa or work permit?</h2><p>Talk to our team and get professional assistance for your immigration and permit needs in Indonesia.</p></div><a className="button button-accent" href={whatsappUrl} target="_blank" rel="noreferrer">Chat on WhatsApp <ArrowRight size={17} /></a></div></section>

      <section id="gallery" className="section gallery-section"><div className="container"><div className="section-heading"><div><p className="eyebrow">OUR GALLERY</p><h2>A closer look at <em>life at Fasqindo.</em></h2></div><p>Explore our office, team activities, and the welcoming environment behind our support.</p></div>{galleryList.length === 0 ? <p className="content-empty">Photos are being uploaded. Please check back soon.</p> : <div className="gallery-grid">{galleryList.map((item, index) => <figure className="gallery-card" key={`${item.src}-${index}`} role="button" tabIndex={0} aria-label={`View ${item.caption}`} onClick={() => setGalleryIndex(index)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setGalleryIndex(index) } }}><img src={item.src} alt={item.alt} /><figcaption><span>{item.span}</span><strong>{item.caption}</strong></figcaption></figure>)}</div>}</div></section>

  <section id="news" className="section news-section"><div className="container"><div className="section-heading"><div><p className="eyebrow">INSIGHTS & UPDATES</p><h2>Stay informed. <em>Move forward.</em></h2></div></div>{newsList.length === 0 ? <p className="content-empty">No updates published yet. Please check back soon.</p> : <div className="news-grid">{newsList.map((item, index) => <article className="news-feature" key={item.id ?? `news-${index}`}><div className="news-image abstract-image">{item.image_url ? <img src={item.image_url} alt={item.title} /> : <><Sparkles size={28} /><span>INSIGHT</span></>}</div><div className="news-meta">{item.label} <span>•</span> {item.date}</div><h3>{item.title}</h3><RichText html={item.summary} className="card-summary" /><button className="card-link news-read-more" type="button" onClick={() => setSelectedNews(item)}>Read more <ArrowRight size={15} /></button></article>)}</div>}</div></section>

      <section className="section activity-section"><div className="container"><div className="section-heading"><div><p className="eyebrow">OUR ACTIVITIES</p><h2>Working alongside <em>trusted partners.</em></h2></div><p>We support companies and institutions with practical immigration and permit assistance across Indonesia.</p></div><div className="activity-layout"><div className="activity-photo"><Image src="/images/fasqindo-activities.png" alt="Fasqindo team activities and professional collaboration meetings" fill sizes="(max-width: 700px) 100vw, 62vw" /></div><div className="activity-copy"><div><span className="activity-kicker">COMPANY CLIENTS</span><h3>Companies that trust our support.</h3><PartnerMarquee items={companyClients} ariaLabel="Company clients" /></div><div className="collaboration-note"><span className="activity-kicker">COLLABORATION</span><p>We collaborate with <strong>KEMNAKER</strong> and <strong>DIRJEN IMIGRASI</strong> to help keep every process aligned with the relevant regulations.</p><PartnerMarquee items={institutionalPartners} className="institution-grid" ariaLabel="Institutional collaborators" /></div></div></div><div className="activity-gallery" aria-label="Company activity gallery"><figure className="gallery-large"><Image src="/images/fasqindo-activity-gallery.png" alt="Fasqindo team discussing immigration documents" fill sizes="(max-width: 700px) 100vw, 58vw" /><figcaption>Team consultation</figcaption></figure><figure><Image src="/images/fasqindo-activities.png" alt="Fasqindo professional collaboration activity" fill sizes="(max-width: 700px) 50vw, 30vw" /><figcaption>Professional collaboration</figcaption></figure><figure><Image src="/images/fasqindo-hero.png" alt="Consultant preparing permit documents" fill sizes="(max-width: 700px) 50vw, 30vw" /><figcaption>Permit assistance</figcaption></figure></div></div></section>

      <section id="contact" className="section contact-section"><div className="container contact-grid"><div><p className="eyebrow">GET IN TOUCH</p><h2>Let&apos;s make your next step <em>clear.</em></h2><p className="body-copy">Have questions about visa, stay permit, or work permit services? Our team is ready to help.</p></div><div className="contact-panel"><div className="contact-details"><div><MapPin size={18} /><span><strong>Address</strong><small>Jl Jengki Gg Al Falah, RT 08 RW 02, No 22A, Kel. Kebon Pala, Kec. Makasar, Jakarta Timur</small></span></div><div><Mail size={18} /><span><strong>Email</strong><small>fasqindo.mandiri@gmail.com</small></span></div><div><Phone size={18} /><span><strong>Phone / WhatsApp</strong><small>021 - 38830023</small></span></div><div><Clock3 size={18} /><span><strong>Operating hours</strong><small>Open 09:00–17:00<br />Closed on Saturdays, Sundays, and national holidays</small></span></div><div><Globe2 size={18} /><span><strong>Instagram</strong><a href="https://instagram.com/fasqindo.mb?stkn=M3FtZnBlbmpxMmts" target="_blank" rel="noreferrer">@fasqindo.mb</a></span></div></div><a className="button button-dark contact-button" href={whatsappUrl} target="_blank" rel="noreferrer">Chat with our team <ArrowRight size={16} /></a></div></div></section>

      <footer className="site-footer"><div className="container footer-grid"><div><a href="#home" className="brand footer-brand"><img className="brand-logo" src="/images/fasqindo-logo-final.png" alt="PT. Fasqindo Mandiri Bersama" /></a><p>Visa <span>•</span> Stay Permit <span>•</span> Work Permit Services</p></div><div className="footer-links"><strong>Explore</strong><a href="#about">About Us</a><a href="#services">Services</a><a href="#process">Process</a><a href="#gallery">Gallery</a><a href="#news">News & Updates</a></div><div className="footer-links"><strong>Contact</strong><span>Jl Jengki Gg Al Falah, RT 08 RW 02, No 22A, Kel. Kebon Pala, Kec. Makasar, Jakarta Timur</span><span>fasqindo.mandiri@gmail.com</span><span>021 - 38830023</span><a href="https://instagram.com/fasqindo.mb?stkn=M3FtZnBlbmpxMmts" target="_blank" rel="noreferrer">Instagram: @fasqindo.mb</a></div><div className="footer-cta"><p>Ready to get started?</p><a className="button button-accent" href={whatsappUrl} target="_blank" rel="noreferrer">Consult via WhatsApp <ArrowRight size={15} /></a></div></div><div className="container footer-bottom"><span>© 2026 PT Fasqindo Mandiri Bersama. All Rights Reserved.</span><span><a href="#contact">Privacy Policy</a><a href="#contact">Terms & Conditions</a></span></div></footer>
      <a className="floating-whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer" aria-label="Chat with PT Fasqindo Mandiri on WhatsApp"><MessageCircle size={23} /><span>Chat on WhatsApp</span></a>
      {selectedNews && <div className="service-modal-backdrop" role="presentation" onClick={() => setSelectedNews(null)}><section className="service-modal" role="dialog" aria-modal="true" aria-labelledby="news-modal-title" onClick={(event) => event.stopPropagation()}><button className="service-modal-close" type="button" onClick={() => setSelectedNews(null)} aria-label="Close news details"><X size={20} /></button>{selectedNews.image_url ? <img className="news-modal-image" src={selectedNews.image_url} alt={selectedNews.title} /> : <div className="news-image abstract-image news-modal-placeholder"><Sparkles size={28} /><span>INSIGHT</span></div>}<div className="service-modal-scroll"><p className="eyebrow">{selectedNews.label} <span>•</span> {selectedNews.date}</p><h2 id="news-modal-title">{selectedNews.title}</h2><RichText html={selectedNews.summary} className="service-modal-intro" /><RichText html={selectedNews.details} className="service-modal-details" /></div></section></div>}
      {selectedService && (() => { const ServiceIcon = selectedService.icon; return <div className="service-modal-backdrop" role="presentation" onClick={() => setSelectedService(null)}><section className="service-modal" role="dialog" aria-modal="true" aria-labelledby="service-modal-title" onClick={(event) => event.stopPropagation()}><button className="service-modal-close" type="button" onClick={() => setSelectedService(null)} aria-label="Close service details"><X size={20} /></button><div className="service-modal-scroll"><div className="service-modal-icon"><ServiceIcon size={26} /></div><p className="eyebrow">SERVICE {selectedService.number}</p><h2 id="service-modal-title">{selectedService.title}</h2><RichText html={selectedService.text} className="service-modal-intro" /><RichText html={selectedService.details} className="service-modal-details" /><a className="button button-accent" href={whatsappUrl} target="_blank" rel="noreferrer" onClick={() => setSelectedService(null)}>Discuss this service <ArrowRight size={16} /></a></div></section></div> })()}
      {galleryIndex !== null && galleryList[galleryIndex] && (
        <div className="gallery-lightbox" role="presentation" onClick={() => setGalleryIndex(null)}>
          <button className="lightbox-close" type="button" onClick={() => setGalleryIndex(null)} aria-label="Close gallery"><X size={20} /></button>
          <button className="lightbox-nav lightbox-prev" type="button" onClick={(event) => { event.stopPropagation(); setGalleryIndex((galleryIndex - 1 + galleryList.length) % galleryList.length) }} aria-label="Previous photo"><ChevronLeft size={24} /></button>
          <figure className="lightbox-figure" onClick={(event) => event.stopPropagation()}>
            <img src={galleryList[galleryIndex].src} alt={galleryList[galleryIndex].alt} />
            <figcaption>{galleryList[galleryIndex].caption} <span>{galleryIndex + 1} / {galleryList.length}</span></figcaption>
          </figure>
          <button className="lightbox-nav lightbox-next" type="button" onClick={(event) => { event.stopPropagation(); setGalleryIndex((galleryIndex + 1) % galleryList.length) }} aria-label="Next photo"><ChevronRight size={24} /></button>
        </div>
      )}
    </main>
  )
}
