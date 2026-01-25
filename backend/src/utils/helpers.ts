// Formata numero de telefone para padrao internacional
export function formatPhoneNumber(phone: string): string {
  // Remove tudo que nao for numero
  const cleaned = phone.replace(/\D/g, '');

  // Se nao tiver codigo do pais, assume Brasil (+55)
  if (cleaned.length === 11) {
    return `55${cleaned}`;
  }

  return cleaned;
}

// Extrai numero do ID do WhatsApp (formato: 5511999999999@c.us)
export function extractPhoneFromWid(wid: string): string {
  return wid.replace('@c.us', '').replace('@s.whatsapp.net', '');
}

// Cria ID do WhatsApp a partir do numero
export function createWid(phone: string): string {
  const formatted = formatPhoneNumber(phone);
  return `${formatted}@c.us`;
}

// Verifica se esta dentro do horario comercial
export function isWithinBusinessHours(
  start: string | null,
  end: string | null,
  days: number[]
): boolean {
  if (!start || !end) return true;

  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.toTimeString().slice(0, 5);

  // Verifica se e um dia de atendimento
  if (!days.includes(currentDay)) return false;

  // Verifica se esta dentro do horario
  return currentTime >= start && currentTime <= end;
}

// Gera delay aleatorio para parecer mais humano
export function randomDelay(min: number = 1000, max: number = 3000): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

// Trunca texto mantendo palavras completas
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  return lastSpace > 0 ? truncated.slice(0, lastSpace) + '...' : truncated + '...';
}

// Escapa caracteres especiais para regex
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Verifica se texto corresponde ao trigger
export function matchesTrigger(
  text: string,
  trigger: string,
  triggerType: 'EXACT' | 'CONTAINS' | 'REGEX'
): boolean {
  const normalizedText = text.toLowerCase().trim();
  const normalizedTrigger = trigger.toLowerCase().trim();

  switch (triggerType) {
    case 'EXACT':
      return normalizedText === normalizedTrigger;
    case 'CONTAINS':
      return normalizedText.includes(normalizedTrigger);
    case 'REGEX':
      try {
        const regex = new RegExp(trigger, 'i');
        return regex.test(text);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

// Paginacao
export function paginate<T>(
  data: T[],
  page: number = 1,
  limit: number = 20
): {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} {
  const total = data.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const paginatedData = data.slice(offset, offset + limit);

  return {
    data: paginatedData,
    total,
    page,
    limit,
    totalPages,
  };
}
