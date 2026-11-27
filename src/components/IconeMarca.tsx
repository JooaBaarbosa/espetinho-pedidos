type Props = {
  nome: "espeto" | "churrasqueira" | "chama";
  tamanho?: number;
};

export function IconeMarca({ nome, tamanho = 24 }: Props) {
  const url = `url(/marca/${nome}.png)`;
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: tamanho,
        height: tamanho,
        maskImage: url,
        WebkitMaskImage: url,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        backgroundColor: "currentColor",
      }}
    />
  );
}
