export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link         from 'next/link'
import { getServerUser, createAdminClient } from '@/lib/supabase/server'
import { ROLE_HOME_ROUTES, type UserRole }  from '@/lib/constants'

export default async function RootPage() {
  const user = await getServerUser()
  if (user) {
    const admin = createAdminClient()
    const { data: profile } = await admin.from('profiles').select('role').eq('user_id', user.id).single()
    const role = (profile?.role as UserRole) ?? 'caminhoneiro'
    redirect(ROLE_HOME_ROUTES[role] ?? '/gestao')
  }
  return <LandingPage />
}

function LandingPage() {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#F5F2EC', color: '#1A1915', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .display { font-family: 'Playfair Display', Georgia, serif; }
        .overline { font-size: 11px; font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase; color: #9C988E; }
        .section { max-width: 1100px; margin: 0 auto; padding: 96px 24px; }
        .divider { border: none; border-top: 1px solid #D8D3C8; }
        .pill-tag { display: inline-flex; align-items: center; gap: 6px; background: #EDE9E0; border: 1px solid #D8D3C8; border-radius: 100px; padding: 6px 16px; font-size: 13px; color: #5C5850; }
        .metric-num { font-family: 'Playfair Display', serif; font-size: 56px; font-weight: 500; line-height: 1; letter-spacing: -0.02em; }
        @keyframes blob { 0%,100%{border-radius:60% 40% 30% 70%/60% 30% 70% 40%} 50%{border-radius:30% 60% 70% 40%/50% 60% 30% 60%} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes fade-up { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fade-up 0.7s ease forwards; }
        .blob-shape { animation: blob 8s ease-in-out infinite, float 6s ease-in-out infinite; }
        .cta-btn { display: inline-flex; align-items: center; gap: 8px; background: #1A1915; color: #F5F2EC; padding: 14px 28px; border-radius: 100px; font-size: 15px; font-weight: 500; text-decoration: none; transition: opacity 0.2s; }
        .cta-btn:hover { opacity: 0.85; }
        .cta-secondary { display: inline-flex; align-items: center; gap: 8px; background: transparent; color: #1A1915; padding: 14px 24px; border-radius: 100px; font-size: 15px; font-weight: 500; text-decoration: none; border: 1px solid #D8D3C8; transition: background 0.2s; }
        .cta-secondary:hover { background: #EDE9E0; }
        .card-surface { background: #EDE9E0; border: 1px solid #D8D3C8; border-radius: 16px; padding: 32px; }
        .card-elevated { background: #EDE9E0; border: 1px solid #D8D3C8; border-radius: 16px; padding: 32px; box-shadow: 0 4px 16px rgba(26,25,21,0.10); }
        .phase-dot { width: 10px; height: 10px; background: #2D2B26; border-radius: 50%; flex-shrink: 0; margin-top: 6px; }
        .flywheel-item { display: flex; align-items: flex-start; gap: 16px; padding: 20px 0; border-bottom: 1px solid #D8D3C8; }
        .flywheel-num { font-family: 'Playfair Display', serif; font-size: 40px; font-weight: 400; color: #D8D3C8; line-height: 1; flex-shrink: 0; width: 48px; }
        @media (max-width: 768px) { .section { padding: 64px 20px; } .metric-num { font-size: 40px; } .hero-grid { grid-template-columns: 1fr !important; } .phases-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(245,242,236,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #D8D3C8' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: '#1A1915', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#F5F2EC', fontSize: 16 }}>🦏</span>
            </div>
            <span className="display" style={{ fontSize: 18, fontWeight: 500 }}>Agregado.Pro</span>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link href="/login" className="cta-secondary" style={{ padding: '10px 20px', fontSize: 14 }}>Entrar</Link>
            <Link href="/cadastro" className="cta-btn" style={{ padding: '10px 20px', fontSize: 14 }}>Começar grátis →</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px 64px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }} className="hero-grid">
        <div className="fade-up">
          <div className="pill-tag" style={{ marginBottom: 24 }}>
            <span>🦏</span> Sistema Operacional do Caminhoneiro
          </div>
          <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 500, lineHeight: 1.1, marginBottom: 24 }}>
            Forte. Blindado.<br />
            <em>Imparável.</em>
          </h1>
          <p style={{ fontSize: 18, color: '#5C5850', lineHeight: 1.7, marginBottom: 40, maxWidth: 480 }}>
            Gestão financeira, marketplace de contratos e crédito inteligente — tudo o que o caminhoneiro agregado precisa para saber se seu caminhão está dando lucro.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/cadastro" className="cta-btn">Começar gratuitamente →</Link>
            <Link href="/login" className="cta-secondary">Já tenho conta</Link>
          </div>
        </div>

        {/* Hero visual — blob + dashboard mock */}
        <div style={{ position: 'relative', height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Blob background */}
          <div className="blob-shape" style={{ position: 'absolute', width: 340, height: 340, background: 'linear-gradient(135deg, #EDE9E0, #D8D3C8)', zIndex: 0 }} />
          {/* Dashboard card mock */}
          <div style={{ position: 'relative', zIndex: 1, background: '#F5F2EC', borderRadius: 20, padding: '28px 28px 24px', width: 300, boxShadow: '0 12px 40px rgba(26,25,21,0.14)', border: '1px solid #D8D3C8' }}>
            <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9C988E', marginBottom: 8 }}>Resultado do mês</p>
            <p className="display" style={{ fontSize: 36, fontWeight: 500, color: '#2A6B3A', marginBottom: 4 }}>+ R$4.820</p>
            <p style={{ fontSize: 13, color: '#5C5850', marginBottom: 24 }}>✅ Negócio no positivo</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[['Receita', 'R$ 12.400'], ['Custo total', 'R$ 7.580'], ['Custo/km', 'R$ 1,87'], ['Margem', '38,9%']].map(([k, v]) => (
                <div key={k} style={{ background: '#EDE9E0', borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ fontSize: 11, color: '#9C988E', marginBottom: 4 }}>{k}</p>
                  <p style={{ fontSize: 15, fontWeight: 500 }}>{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* COMO FUNCIONA */}
      <section className="section">
        <p className="overline" style={{ marginBottom: 16 }}>Em 3 minutos</p>
        <h2 className="display" style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 500, lineHeight: 1.2, marginBottom: 48 }}>
          Descubra se seu caminhão está<br />dando lucro agora mesmo.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24, position: 'relative' }}>
          {[
            { step: '1', icon: '📋', title: 'Crie sua conta grátis', desc: 'Cadastro em 2 minutos. Sem cartão de crédito. Sem burocracia.' },
            { step: '2', icon: '💵', title: 'Lance receitas e custos', desc: 'Diesel, pedágio, parcela, manutenção — qualquer lançamento do mês.' },
            { step: '3', icon: '📊', title: 'Veja o resultado real', desc: 'DRE automático com custo por km, margem operacional e resultado do mês.' },
            { step: '4', icon: '🎯', title: 'Tome decisões com dados', desc: 'Aceite apenas contratos que cobrem seu custo real. Negocie com segurança.' },
          ].map((s, i) => (
            <div key={s.step} style={{ position: 'relative' }}>
              {i < 3 && (
                <div style={{ position: 'absolute', top: 20, right: -12, width: 24, height: 1, background: 'var(--color-border)', display: 'none' }} className="md-arrow" />
              )}
              <div className="card-surface" style={{ height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: 36, fontWeight: 400, color: 'var(--color-border)', lineHeight: 1 }}>{s.step}</span>
                  <span style={{ fontSize: 28 }}>{s.icon}</span>
                </div>
                <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>{s.title}</p>
                <p style={{ fontSize: 14, color: '#5C5850', lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <Link href="/cadastro" className="cta-btn">Começar agora — é grátis</Link>
        </div>
      </section>

      <hr className="divider" />
      {/* MÉTRICAS DO MERCADO */}
      <section className="section">
        <p className="overline" style={{ textAlign: 'center', marginBottom: 48 }}>O mercado que a plataforma serve</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 48, textAlign: 'center' }}>
          {[
            ['2 mi+', 'caminhões em circulação no Brasil'],
            ['1 mi', 'caminhoneiros autônomos ativos'],
            ['R$0', 'custo para começar a usar'],
          ].map(([num, desc]) => (
            <div key={num}>
              <p className="metric-num display" style={{ color: '#1A1915', marginBottom: 12 }}>{num}</p>
              <p style={{ fontSize: 15, color: '#5C5850', maxWidth: 200, margin: '0 auto' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <hr className="divider" />

      {/* PROBLEMA */}
      <section className="section">
        <div style={{ maxWidth: 720 }}>
          <p className="overline" style={{ marginBottom: 16 }}>O problema que resolvemos</p>
          <h2 className="display" style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 500, lineHeight: 1.2, marginBottom: 24 }}>
            O caminhoneiro opera como empresa,<br />mas sem as ferramentas de uma.
          </h2>
          <p style={{ fontSize: 17, color: '#5C5850', lineHeight: 1.8, marginBottom: 40 }}>
            A transportadora sabe o custo médio do mercado. O caminhoneiro, na maioria das vezes, desconhece seu próprio custo real — e aceita contratos que comprometem a margem sem perceber.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[
            ['❌', 'Sem controle financeiro', 'Decisões tomadas no escuro'],
            ['❌', 'Sem cálculo de custo/km', 'Contratos aceitos abaixo do custo'],
            ['❌', 'Sem visão de lucro real', 'Margens invisíveis'],
            ['❌', 'Sem acesso a crédito justo', 'Crédito caro, informal ou negado'],
          ].map(([icon, title, desc]) => (
            <div key={title} className="card-surface">
              <p style={{ fontSize: 24, marginBottom: 12 }}>{icon}</p>
              <p style={{ fontWeight: 500, marginBottom: 6 }}>{title}</p>
              <p style={{ fontSize: 14, color: '#5C5850' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <hr className="divider" />

      {/* SOLUÇÃO — 4 PILARES */}
      <section className="section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 56, flexWrap: 'wrap', gap: 24 }}>
          <div>
            <p className="overline" style={{ marginBottom: 12 }}>A plataforma</p>
            <h2 className="display" style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 500, lineHeight: 1.2 }}>
              Uma infraestrutura financeira<br />completa para a estrada.
            </h2>
          </div>
          <Link href="/cadastro" className="cta-btn">Começar agora →</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {[
            {
              num: '01', icon: '📊',
              title: 'Gestão Financeira',
              desc: 'DRE simplificado com cálculo automático de custo por km. Saiba exatamente se seu caminhão está dando lucro.',
              tags: ['DRE', 'Custo/km', 'Resultado mensal'],
            },
            {
              num: '02', icon: '📋',
              title: 'Marketplace de Contratos',
              desc: 'Encontre e publique contratos de agregado. Análise automática de viabilidade baseada nos seus custos reais.',
              tags: ['Vagas', 'Viabilidade', 'Candidaturas'],
            },
            {
              num: '03', icon: '💳',
              title: 'Crédito Inteligente',
              desc: 'Score proprietário baseado em dados reais do DRE. Antecipação de recebíveis e cartão com limite transparente.',
              tags: ['Score', 'Antecipação', 'Limite real'],
            },
            {
              num: '04', icon: '🏦',
              title: 'Banco Digital',
              desc: 'Conta e cartão construídos para a estrada. IA classifica automaticamente cada gasto no DRE sem lançamento manual.',
              tags: ['BaaS', 'IA', 'Em breve'],
            },
          ].map(p => (
            <div key={p.num} className="card-elevated" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 32 }}>{p.icon}</span>
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 40, fontWeight: 400, color: '#D8D3C8', lineHeight: 1 }}>{p.num}</span>
              </div>
              <div>
                <p style={{ fontWeight: 500, fontSize: 17, marginBottom: 8 }}>{p.title}</p>
                <p style={{ fontSize: 14, color: '#5C5850', lineHeight: 1.6 }}>{p.desc}</p>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 'auto' }}>
                {p.tags.map(t => (
                  <span key={t} style={{ background: '#1A191510', borderRadius: 100, padding: '3px 10px', fontSize: 12, color: '#5C5850' }}>{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <hr className="divider" />

      {/* ANÁLISE DE VIABILIDADE */}
      <section className="section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }} >
        <div>
          <p className="overline" style={{ marginBottom: 16 }}>Marketplace inteligente</p>
          <h2 className="display" style={{ fontSize: 'clamp(26px, 3vw, 40px)', fontWeight: 500, lineHeight: 1.2, marginBottom: 20 }}>
            Saiba se o contrato vale a pena <em>antes</em> de aceitar.
          </h2>
          <p style={{ fontSize: 16, color: '#5C5850', lineHeight: 1.8, marginBottom: 32 }}>
            Cada vaga no marketplace é analisada automaticamente com base nos seus custos reais. Nada de chute — você vê a margem real antes de mandar a candidatura.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { color: '#D1FAE5', text: '#059669', label: '✅ Contrato saudável', desc: 'Margem acima de 15%' },
              { color: '#FEF3C7', text: '#D97706', label: '⚠️ No limite', desc: 'Margem entre 0% e 15%' },
              { color: '#FEE2E2', text: '#DC2626', label: '❌ Abaixo do custo', desc: 'Contrato gera prejuízo' },
            ].map(v => (
              <div key={v.label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, background: v.color }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: v.text }}>{v.label}</span>
                <span style={{ fontSize: 13, color: v.text, opacity: 0.8 }}>— {v.desc}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Contract card mock */}
        <div style={{ background: '#EDE9E0', borderRadius: 20, padding: 28, border: '1px solid #D8D3C8', boxShadow: '0 4px 16px rgba(26,25,21,0.08)' }}>
          <p style={{ fontSize: 12, color: '#9C988E', marginBottom: 4 }}>REVESP Transportes</p>
          <p style={{ fontWeight: 600, fontSize: 17, marginBottom: 6 }}>Agregado SP → BH em Truck</p>
          <p style={{ fontSize: 14, color: '#5C5850', marginBottom: 20 }}>📍 São Paulo → Belo Horizonte · 1.250 km</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 12, color: '#9C988E' }}>Valor do frete</p>
              <p className="display" style={{ fontSize: 26, fontWeight: 500 }}>R$ 8.000</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 12, color: '#9C988E' }}>Por viagem</p>
              <p style={{ fontSize: 15, fontWeight: 500, color: '#5C5850' }}>Truck</p>
            </div>
          </div>
          <div style={{ background: '#D1FAE5', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
            <p style={{ fontWeight: 600, color: '#059669', fontSize: 14 }}>✅ Contrato saudável · margem 30,2%</p>
            <p style={{ fontSize: 13, color: '#059669', opacity: 0.8, marginTop: 4 }}>Custo estimado: R$ 5.584 · Lucro: R$ 2.416</p>
          </div>
          <div style={{ background: '#1A1915', borderRadius: 100, padding: '12px 20px', textAlign: 'center', color: '#F5F2EC', fontSize: 14, fontWeight: 500 }}>
            Candidatar-se →
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* FLYWHEEL */}
      <section className="section">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'start' }}>
          <div>
            <p className="overline" style={{ marginBottom: 16 }}>O motor do negócio</p>
            <h2 className="display" style={{ fontSize: 'clamp(26px, 3vw, 40px)', fontWeight: 500, lineHeight: 1.2, marginBottom: 20 }}>
              Cada viagem melhora<br />o produto.
            </h2>
            <p style={{ fontSize: 16, color: '#5C5850', lineHeight: 1.8 }}>
              Quanto mais o caminhoneiro usa, mais preciso o DRE, melhor o score, mais adequado o crédito, maior a retenção. Um flywheel que se alimenta de dados reais.
            </p>
          </div>
          <div>
            {[
              ['① Mais caminhoneiros usando o sistema de gestão'],
              ['② Caminhoneiro adota o cartão → despesas capturadas automaticamente'],
              ['③ Mais dados financeiros reais e transacionais coletados'],
              ['④ IA melhora → DRE mais preciso → melhores decisões'],
              ['⑤ Score mais preciso → crédito com melhores condições'],
              ['⑥ Maior retenção — custo de troca cresce com cada viagem'],
            ].map(([text], i) => (
              <div key={i} className="flywheel-item" style={{ borderBottom: i === 5 ? 'none' : '1px solid #D8D3C8' }}>
                <span className="flywheel-num display">{`0${i + 1}`}</span>
                <p style={{ fontSize: 15, color: '#5C5850', lineHeight: 1.6, paddingTop: 8 }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* VANTAGEM COMPETITIVA */}
      <section className="section">
        <p className="overline" style={{ marginBottom: 16 }}>Vantagem competitiva</p>
        <h2 className="display" style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 500, lineHeight: 1.2, marginBottom: 48, maxWidth: 700 }}>
          Um moat construído de dados que ninguém mais tem.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
          {[
            { icon: '🗄️', title: 'Dados proprietários', desc: 'Dados operacionais e financeiros reais do caminhoneiro agregado, não existem em nenhuma outra plataforma.' },
            { icon: '📈', title: 'Modelo de risco vertical', desc: 'Score alimentado por margem/km, estabilidade contratual e padrão de despesas — nunca declaratório.' },
            { icon: '🔗', title: 'Crédito vinculado ao contrato', desc: 'Estrutura de crédito consignado empresarial que reduz estruturalmente o risco de inadimplência.' },
            { icon: '🤖', title: 'IA treinada no segmento', desc: 'Modelo exclusivo para o caminhoneiro agregado. Com o tempo, impossível de replicar sem o histórico acumulado.' },
            { icon: '🔒', title: 'Lock-in operacional', desc: 'Gestão + marketplace + cartão + crédito + benefícios. O custo de troca cresce com cada viagem feita.' },
          ].map(m => (
            <div key={m.title} className="card-surface">
              <p style={{ fontSize: 28, marginBottom: 14 }}>{m.icon}</p>
              <p style={{ fontWeight: 500, fontSize: 15, marginBottom: 8 }}>{m.title}</p>
              <p style={{ fontSize: 14, color: '#5C5850', lineHeight: 1.6 }}>{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <hr className="divider" />

      {/* FASES */}
      <section className="section">
        <p className="overline" style={{ marginBottom: 16 }}>Roadmap</p>
        <h2 className="display" style={{ fontSize: 'clamp(26px, 3vw, 40px)', fontWeight: 500, lineHeight: 1.2, marginBottom: 48 }}>
          De gestão a banco digital,<br />passo a passo.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }} className="phases-grid">
          {[
            { num: 'Phase 1', status: '✅ Disponível', title: 'Core Management', items: ['DRE simplificado', 'Custo por km', 'Resultado do negócio'] },
            { num: 'Phase 2', status: '✅ Disponível', title: 'Marketplace + Crédito', items: ['Contratos de agregado', 'Análise de viabilidade', 'Score + Antecipação'] },
            { num: 'Phase 3', status: '🔄 Desenvolvendo', title: 'Banco Digital', items: ['Conta + cartão de débito', 'IA de classificação', 'Dashboard de viagem'] },
            { num: 'Phase 4', status: '🔜 Em breve', title: 'Crédito Pleno', items: ['Cartão de crédito', 'Limite dinâmico', 'Antecipação de recebíveis'] },
            { num: 'Phase 5', status: '🔜 Futuro', title: 'Ecossistema', items: ['Clube de benefícios', 'Seguros embarcados', 'Open Finance'] },
          ].map(ph => (
            <div key={ph.num} style={{ background: '#EDE9E0', border: '1px solid #D8D3C8', borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#9C988E', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{ph.num}</span>
                <span style={{ fontSize: 11, color: '#5C5850' }}>{ph.status}</span>
              </div>
              <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>{ph.title}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ph.items.map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div className="phase-dot" />
                    <p style={{ fontSize: 13, color: '#5C5850', lineHeight: 1.5 }}>{item}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ background: '#1A1915', color: '#F5F2EC' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '96px 24px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, background: '#F5F2EC', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px', fontSize: 28 }}>
            🦏
          </div>
          <h2 className="display" style={{ fontSize: 'clamp(32px, 4vw, 56px)', fontWeight: 500, lineHeight: 1.15, marginBottom: 24, color: '#F5F2EC' }}>
            Seu caminhão está<br />dando lucro?
          </h2>
          <p style={{ fontSize: 18, color: 'rgba(245,242,236,0.65)', lineHeight: 1.7, marginBottom: 40, maxWidth: 520, margin: '0 auto 40px' }}>
            Descubra em minutos. Gratuito, sem cartão de crédito, sem complicação.
          </p>
          <Link href="/cadastro" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F5F2EC', color: '#1A1915', padding: '16px 36px', borderRadius: 100, fontSize: 16, fontWeight: 600, textDecoration: 'none', transition: 'opacity 0.2s' }}>
            Começar gratuitamente →
          </Link>
          <p style={{ fontSize: 13, color: 'rgba(245,242,236,0.4)', marginTop: 20 }}>
            Já são caminhoneiros gerenciando seus negócios com Agregado.Pro
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid #D8D3C8', padding: '32px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🦏</span>
            <span className="display" style={{ fontWeight: 500 }}>Agregado.Pro</span>
          </div>
          <p style={{ fontSize: 13, color: '#9C988E' }}>
            Sistema Operacional e Infraestrutura Financeira do Caminhoneiro Agregado
          </p>
          <p style={{ fontSize: 11, color: '#C9C3BC', marginTop: 4 }}>
            © 2026 Agregado.Pro — CNPJ em formação
          </p>
          <div style={{ display: 'flex', gap: 20 }}>
            <Link href="/login" style={{ fontSize: 13, color: '#5C5850', textDecoration: 'none' }}>Entrar</Link>
            <Link href="/cadastro" style={{ fontSize: 13, color: '#5C5850', textDecoration: 'none' }}>Criar conta</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
