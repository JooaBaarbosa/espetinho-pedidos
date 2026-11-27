"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { entrar as entrarNaApi, ErroApi } from "@/lib/api";
import styles from "./FormEntrar.module.css";

type Props = {
  /** Troca a chamada à API (usado nos testes). */
  entrar?: (senha: string) => Promise<boolean>;
};

export function FormEntrar({ entrar = entrarNaApi }: Props) {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    if (enviando || !senha) return;
    setEnviando(true);
    setErro(null);
    try {
      if (await entrar(senha)) {
        router.replace("/");
        router.refresh();
        return;
      }
      setErro("Senha incorreta");
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : "Não foi possível entrar. Verifique a conexão.");
    }
    setEnviando(false);
  }

  return (
    <form className={styles.form} onSubmit={aoEnviar}>
      <label htmlFor="senha" className={styles.rotulo}>
        Senha
      </label>
      <input
        id="senha"
        type="password"
        autoComplete="current-password"
        autoFocus
        className={styles.campo}
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        aria-invalid={erro === "Senha incorreta"}
        aria-describedby={erro ? "erro-entrar" : undefined}
      />
      {erro && (
        <p id="erro-entrar" role="alert" className={styles.erro}>
          {erro}
        </p>
      )}
      <button type="submit" className={styles.botao} disabled={enviando || !senha}>
        {enviando ? "Entrando" : "Entrar"}
      </button>
    </form>
  );
}
