import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Cria usuario admin padrao
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@zapify.com' },
    update: {},
    create: {
      email: 'admin@zapify.com',
      password: adminPassword,
      name: 'Administrador',
      role: 'ADMIN',
    },
  });
  console.log(`✅ Usuario admin criado: ${admin.email}`);

  // Cria configuracao padrao do bot
  const config = await prisma.botConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      isActive: true,
      aiProvider: 'gemini',
      aiModel: 'gemini-2.5-flash',
      aiTemperature: 0.7,
      aiMaxTokens: 1000,
      welcomeMessage: 'Ola! Bem-vindo ao nosso atendimento. Como posso ajudar?',
      awayMessage: 'Desculpe, estamos fora do horario de atendimento. Retornaremos em breve!',
      businessHoursStart: '09:00',
      businessHoursEnd: '18:00',
      businessDays: [1, 2, 3, 4, 5], // Segunda a Sexta
      systemPrompt: `Voce e um assistente virtual de atendimento ao cliente via WhatsApp.

Diretrizes:
- Seja educado, profissional e prestativo
- Responda de forma clara e objetiva
- Use linguagem adequada para WhatsApp (mensagens curtas e diretas)
- Se nao souber algo, seja honesto e ofereca alternativas
- Evite respostas muito longas
- Use emojis com moderacao quando apropriado`,
    },
  });
  console.log(`✅ Configuracao do bot criada`);

  // Cria algumas auto-respostas de exemplo
  const autoReplies = [
    {
      trigger: 'oi',
      triggerType: 'EXACT' as const,
      response: 'Ola! Como posso ajudar voce hoje?',
      priority: 10,
    },
    {
      trigger: 'ola',
      triggerType: 'EXACT' as const,
      response: 'Ola! Como posso ajudar voce hoje?',
      priority: 10,
    },
    {
      trigger: 'preco',
      triggerType: 'CONTAINS' as const,
      response: 'Para informacoes sobre precos, por favor acesse nosso site ou aguarde um atendente.',
      priority: 5,
    },
    {
      trigger: 'horario',
      triggerType: 'CONTAINS' as const,
      response: 'Nosso horario de atendimento e de segunda a sexta, das 9h as 18h.',
      priority: 5,
    },
    {
      trigger: 'obrigado',
      triggerType: 'CONTAINS' as const,
      response: 'Por nada! Estamos a disposicao. Tenha um otimo dia!',
      priority: 3,
    },
  ];

  for (const reply of autoReplies) {
    await prisma.autoReply.upsert({
      where: { id: reply.trigger },
      update: reply,
      create: reply,
    });
  }
  console.log(`✅ ${autoReplies.length} auto-respostas criadas`);

  // Cria alguns templates de exemplo
  const templates = [
    {
      name: 'Boas-vindas',
      content: 'Ola {{nome}}! Seja bem-vindo(a) ao nosso atendimento. Como posso ajudar?',
      category: 'atendimento',
      variables: ['nome'],
    },
    {
      name: 'Confirmacao de Pedido',
      content: 'Ola {{nome}}! Seu pedido #{{pedido}} foi confirmado e esta sendo processado. Previsao de entrega: {{data}}.',
      category: 'vendas',
      variables: ['nome', 'pedido', 'data'],
    },
    {
      name: 'Lembrete de Pagamento',
      content: 'Ola {{nome}}! Lembramos que sua fatura no valor de R$ {{valor}} vence em {{data}}. Qualquer duvida, estamos a disposicao!',
      category: 'financeiro',
      variables: ['nome', 'valor', 'data'],
    },
    {
      name: 'Agradecimento',
      content: 'Obrigado por entrar em contato, {{nome}}! Foi um prazer atende-lo(a). Ate a proxima!',
      category: 'atendimento',
      variables: ['nome'],
    },
  ];

  for (const template of templates) {
    await prisma.template.create({
      data: template,
    });
  }
  console.log(`✅ ${templates.length} templates criados`);

  // Cria exemplos de base de conhecimento
  const knowledgeItems = [
    {
      category: 'COMPANY' as const,
      title: 'Nome da Empresa',
      content: 'Somos a Zapify, uma empresa especializada em automacao de atendimento via WhatsApp.',
      priority: 10,
    },
    {
      category: 'COMPANY' as const,
      title: 'Localizacao',
      content: 'Estamos localizados em Sao Paulo, Brasil. Atendemos todo o territorio nacional.',
      priority: 5,
    },
    {
      category: 'RULES' as const,
      title: 'Regra Principal',
      content: 'Sempre responda de forma educada e profissional. Nunca fale sobre assuntos que nao sejam relacionados aos nossos produtos e servicos.',
      priority: 10,
    },
    {
      category: 'RULES' as const,
      title: 'Encaminhamento para Atendente',
      content: 'Se o cliente solicitar falar com um humano ou se voce nao souber responder, informe que um atendente entrara em contato em breve.',
      priority: 8,
    },
    {
      category: 'FAQ' as const,
      title: 'Como funciona o servico?',
      content: 'Nosso servico automatiza o atendimento via WhatsApp usando inteligencia artificial. Voce cadastra as informacoes e o bot responde seus clientes 24/7.',
      priority: 5,
    },
    {
      category: 'PRICING' as const,
      title: 'Planos disponiveis',
      content: 'Oferecemos planos a partir de R$ 99/mes. Para mais informacoes sobre precos, entre em contato com nossa equipe comercial.',
      priority: 5,
    },
    {
      category: 'POLICIES' as const,
      title: 'Politica de Reembolso',
      content: 'Oferecemos reembolso integral em ate 7 dias apos a contratacao, sem perguntas.',
      priority: 5,
    },
  ];

  for (const item of knowledgeItems) {
    await prisma.knowledgeBase.create({
      data: item,
    });
  }
  console.log(`✅ ${knowledgeItems.length} itens de conhecimento criados`);

  console.log('🎉 Seed concluido com sucesso!');
  console.log('\n📌 Credenciais do admin:');
  console.log('   Email: admin@zapify.com');
  console.log('   Senha: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
