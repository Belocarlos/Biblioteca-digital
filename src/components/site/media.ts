/** Endereço público de uma imagem armazenada (capas, cartazes, fotografias e logótipos). */
export function mediaUrl(key: string | null | undefined) {
  return key ? `/media/${key}` : null;
}
