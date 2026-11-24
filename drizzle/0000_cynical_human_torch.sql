CREATE TYPE "public"."status_pedido" AS ENUM('preparacao', 'espera', 'entregue', 'cancelado');--> statement-breakpoint
CREATE TABLE "config" (
	"id" integer PRIMARY KEY NOT NULL,
	"tempo_max_min" integer DEFAULT 15 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "itens_pedido" (
	"id" serial PRIMARY KEY NOT NULL,
	"pedido_id" uuid NOT NULL,
	"sabor_id" integer NOT NULL,
	"nome_sabor" text NOT NULL,
	"quantidade" integer NOT NULL,
	CONSTRAINT "itens_pedido_quantidade_check" CHECK ("itens_pedido"."quantidade" between 1 and 50)
);
--> statement-breakpoint
CREATE TABLE "pedidos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cliente" text NOT NULL,
	"status" "status_pedido" DEFAULT 'preparacao' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"pronto_em" timestamp with time zone,
	"finalizado_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sabores" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"ordem" integer NOT NULL,
	CONSTRAINT "sabores_nome_unique" UNIQUE("nome")
);
--> statement-breakpoint
ALTER TABLE "itens_pedido" ADD CONSTRAINT "itens_pedido_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_pedido" ADD CONSTRAINT "itens_pedido_sabor_id_sabores_id_fk" FOREIGN KEY ("sabor_id") REFERENCES "public"."sabores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pedidos_status_criado_idx" ON "pedidos" USING btree ("status","criado_em");