"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut } from "lucide-react";
import { EditorSabores } from "@/components/EditorSabores";
import { EditorTempo } from "@/components/EditorTempo";
import { Rodape } from "@/components/Rodape";
import {
  buscarConfig,
  buscarTodosSabores,
  criarSabor,
  editarSabor,
  sair,
  salvarConfig,
  SessaoExpirada,
} from "@/lib/api";
import type { Sabor } from "@/lib/tipos";
import styles from "./configuracoes.module.css";

export default function PaginaConfiguracoes() {
  const router = useRouter();
  const [sabores, setSabores] = useState<Sabor[] | null>(null);
  const [tempoMaxMin, setTempoMaxMin] = useState<number | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [erroSair, setErroSair] = useState<string | null>(null);

  /** Qualquer 401 manda para a tela de entrada; o erro segue para quem chamou. */
  const comSessao = useCallback(
    async <T,>(tarefa: () => Promise<T>): Promise<T> => {
      try {
        return await tarefa();
      } catch (e) {
        if (e instanceof SessaoExpirada) router.replace("/entrar");
        throw e;
      }
    },
    [router],
  );

  const recarregarSabores = useCallback(async () => {
    setSabores(await comSessao(buscarTodosSabores));
  }, [comSessao]);

  useEffect(() => {
    let ativo = true;
    comSessao(() => Promise.all([buscarTodosSabores(), buscarConfig()]))
      .then(([lista, config]) => {
        if (!ativo) return;
        setSabores(lista);
        setTempoMaxMin(config.tempoMaxMin);
      })
      .catch((e: unknown) => {
        if (ativo && !(e instanceof SessaoExpirada)) {
          setErroCarga("Não foi possível carregar as configurações. Verifique a conexão.");
        }
      });
    return () => {
      ativo = false;
    };
  }, [comSessao]);

  async function aoSair() {
    setErroSair(null);
    try {
      await sair();
      router.replace("/entrar");
    } catch (e) {
      if (e instanceof SessaoExpirada) router.replace("/entrar");
      else setErroSair("Não foi possível sair. Verifique a conexão.");
    }
  }

  return (
    <div className={styles.pagina}>
      <main className={styles.principal}>
        <Link href="/" className={styles.voltar}>
          <ArrowLeft aria-hidden="true" size={20} />
          Voltar ao painel
        </Link>
        <h1 className={styles.titulo}>Configurações</h1>

        {erroCarga && (
          <p role="alert" className={styles.erro}>
            {erroCarga}
          </p>
        )}
        {!erroCarga && (sabores === null || tempoMaxMin === null) && <p>Carregando</p>}

        {sabores && tempoMaxMin !== null && (
          <>
            <EditorSabores
              inicial={sabores}
              api={{
                criar: (nome) => comSessao(() => criarSabor(nome)),
                editar: (id, campos) => comSessao(() => editarSabor(id, campos)),
              }}
              aoMudar={recarregarSabores}
            />
            <EditorTempo
              inicial={tempoMaxMin}
              salvar={(n) => comSessao(() => salvarConfig(n))}
            />
          </>
        )}

        <section className={styles.sessao}>
          <button type="button" className={styles.sair} onClick={() => void aoSair()}>
            <LogOut aria-hidden="true" size={20} />
            Sair deste aparelho
          </button>
          {erroSair && (
            <p role="alert" className={styles.erro}>
              {erroSair}
            </p>
          )}
        </section>
      </main>
      <Rodape />
    </div>
  );
}
