/**
 * Relógio corrigido pelo servidor: `agora` do servidor mais o tempo local passado desde
 * a resposta. Usa só a diferença entre duas leituras locais (por padrão
 * `performance.now()`, monotônico), então o horário errado do aparelho não interfere.
 */
export function criarRelogio(
  servidorAgoraISO: string,
  localNoRecebimento: number,
): (localAgora?: number) => Date {
  const servidor = new Date(servidorAgoraISO).getTime();
  return (localAgora = performance.now()) => new Date(servidor + (localAgora - localNoRecebimento));
}
