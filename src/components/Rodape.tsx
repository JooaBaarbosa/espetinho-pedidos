import Link from "next/link";
import styles from "./Rodape.module.css";

export function Rodape() {
  return (
    <footer className={styles.rodape}>
      <nav aria-label="Informações legais" className={styles.links}>
        <Link href="/privacidade">Privacidade</Link>
        <Link href="/termos">Termos</Link>
      </nav>
    </footer>
  );
}
