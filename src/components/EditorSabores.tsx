"use client";

import { useState, type FormEvent } from "react";
import { ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { ErroApi } from "@/lib/api";
import type { Sabor } from "@/lib/tipos";
import styles from "./EditorSabores.module.css";

type Props = {
  inicial: Sabor[];
  api: {
    criar: (nome: string) => Promise<unknown>;
    editar: (id: number, campos: Partial<Pick<Sabor, "nome" | "ativo" | "ordem">>) => Promise<unknown>;
  };
  /** Chamado depois de cada alteração salva; a tela recarrega a lista e devolve `inicial` novo. */
  aoMudar?: () => void | Promise<void>;
};

const CHAVE_NOVO = "novo";

export function EditorSabores({ inicial, api, aoMudar }: Props) {
  const sabores = [...inicial].sort((a, b) => a.ordem - b.ordem || a.id - b.id);
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [novoNome, setNovoNome] = useState("");
  const [editando, setEditando] = useState<number | null>(null);
  const [nomeEditado, setNomeEditado] = useState("");

  /**
   * Roda uma alteração e recarrega a lista mesmo se a escrita falhar (uma troca de ordem pode ter
   * gravado só metade). Mostra o erro junto do controle `chave` e devolve se a escrita deu certo.
   */
  async function executar(chave: string | number, tarefa: () => Promise<void>): Promise<boolean> {
    setSalvando(true);
    setErros({});
    let escreveu = false;
    let mensagem: string | null = null;
    try {
      await tarefa();
      escreveu = true;
    } catch (e) {
      mensagem = e instanceof ErroApi ? e.message : "Não foi possível salvar. Verifique a conexão.";
    }
    try {
      await aoMudar?.();
    } catch {
      if (escreveu) mensagem = "Salvo, mas não foi possível atualizar a lista.";
    }
    if (mensagem) setErros({ [chave]: mensagem });
    setSalvando(false);
    return escreveu;
  }

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    const nome = novoNome.trim();
    if (salvando) return;
    if (!nome) {
      setErros({ [CHAVE_NOVO]: "Informe o nome do sabor" });
      return;
    }
    if (await executar(CHAVE_NOVO, async () => void (await api.criar(nome)))) setNovoNome("");
  }

  function mover(indice: number, delta: -1 | 1) {
    const a = sabores[indice];
    const b = sabores[indice + delta];
    if (!a || !b || salvando) return;
    void executar(a.id, async () => {
      await api.editar(a.id, { ordem: b.ordem });
      await api.editar(b.id, { ordem: a.ordem });
    });
  }

  function alternarAtivo(s: Sabor) {
    if (salvando) return;
    void executar(s.id, async () => void (await api.editar(s.id, { ativo: !s.ativo })));
  }

  function comecarEdicao(s: Sabor) {
    setErros({});
    setEditando(s.id);
    setNomeEditado(s.nome);
  }

  async function salvarNome(e: FormEvent, s: Sabor) {
    e.preventDefault();
    const nome = nomeEditado.trim();
    if (salvando) return;
    if (!nome) {
      setErros({ [s.id]: "Informe o nome do sabor" });
      return;
    }
    if (nome === s.nome) {
      setEditando(null);
      return;
    }
    if (await executar(s.id, async () => void (await api.editar(s.id, { nome })))) setEditando(null);
  }

  return (
    <section className={styles.secao} aria-labelledby="titulo-sabores">
      <h2 id="titulo-sabores" className={styles.titulo}>
        Sabores
      </h2>
      <ul className={styles.lista}>
        {sabores.map((s, i) => (
          <li key={s.id} className={`${styles.linha} ${s.ativo ? "" : styles.inativo}`}>
            <div className={styles.cabecaLinha}>
              {editando === s.id ? (
                <form className={styles.edicao} onSubmit={(e) => void salvarNome(e, s)}>
                  <label htmlFor={`nome-${s.id}`} className={styles.oculto}>
                    Nome do sabor
                  </label>
                  <input
                    id={`nome-${s.id}`}
                    className={styles.campo}
                    value={nomeEditado}
                    onChange={(e) => setNomeEditado(e.target.value)}
                    maxLength={40}
                    autoFocus
                  />
                  <button type="submit" className={styles.botao} disabled={salvando}>
                    Salvar nome
                  </button>
                  <button
                    type="button"
                    className={styles.botaoClaro}
                    disabled={salvando}
                    onClick={() => setEditando(null)}
                  >
                    Cancelar
                  </button>
                </form>
              ) : (
                <>
                  <span className={styles.nome}>
                    {s.nome}
                    {!s.ativo && <span className={styles.etiqueta}>Inativo</span>}
                  </span>
                  <div className={styles.acoes}>
                    <button
                      type="button"
                      className={styles.icone}
                      aria-label={`Mover ${s.nome} para cima`}
                      disabled={salvando || i === 0}
                      onClick={() => mover(i, -1)}
                    >
                      <ChevronUp aria-hidden="true" size={22} />
                    </button>
                    <button
                      type="button"
                      className={styles.icone}
                      aria-label={`Mover ${s.nome} para baixo`}
                      disabled={salvando || i === sabores.length - 1}
                      onClick={() => mover(i, 1)}
                    >
                      <ChevronDown aria-hidden="true" size={22} />
                    </button>
                    <button
                      type="button"
                      className={styles.icone}
                      aria-label={`Renomear ${s.nome}`}
                      disabled={salvando}
                      onClick={() => comecarEdicao(s)}
                    >
                      <Pencil aria-hidden="true" size={20} />
                    </button>
                    <button
                      type="button"
                      className={styles.botaoClaro}
                      aria-label={`${s.ativo ? "Desativar" : "Reativar"} ${s.nome}`}
                      disabled={salvando}
                      onClick={() => alternarAtivo(s)}
                    >
                      {s.ativo ? "Desativar" : "Reativar"}
                    </button>
                  </div>
                </>
              )}
            </div>
            {erros[s.id] && (
              <p role="alert" className={styles.erro}>
                {erros[s.id]}
              </p>
            )}
          </li>
        ))}
      </ul>

      <form className={styles.novo} onSubmit={(e) => void adicionar(e)}>
        <label htmlFor="novo-sabor" className={styles.rotulo}>
          Novo sabor
        </label>
        <div className={styles.novoLinha}>
          <input
            id="novo-sabor"
            className={styles.campo}
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            maxLength={40}
          />
          <button type="submit" className={styles.botao} disabled={salvando}>
            Adicionar
          </button>
        </div>
        {erros[CHAVE_NOVO] && (
          <p role="alert" className={styles.erro}>
            {erros[CHAVE_NOVO]}
          </p>
        )}
      </form>
    </section>
  );
}
