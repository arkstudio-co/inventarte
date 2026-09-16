# docs/dependencias.md — Registro de dependencias aprobadas

Toda entrada de `dependencies` y `devDependencies` de `package.json` tiene que estar
listada aquí. La guardia `tests/guards/guard-dependencias-aprobadas.test.ts` compara las
dos listas y falla si sobra algo en `package.json`. El gate corre sin red: la guardia no
consulta npm, solo compara nombres contra esta tabla. Los cuatro checks los verifica una
persona (o el agente con red disponible) **antes** de añadir la fila, y la fila es el acta.

La regla y su porqué viven en `docs/architecture.md > Dependencias de terceros`.

## Cómo se añade una fila

1. El agente propone: qué hace la librería, qué código nos ahorra, y el resultado de los
   cuatro checks (`npm view <pkg> deprecated time.modified license`, descargas semanales).
2. **El humano aprueba.** Sin aprobación no se instala; el agente para y devuelve.
3. Se añade la fila con la fecha y quién aprobó, y se instala.

## Estados

- `aprobada` — pasó los cuatro checks y un humano la aprobó. La fila dice cuándo.
- `excepcion` — falla algún check y el humano la aceptó igual. La fila dice **qué check
  falló y por qué se aceptó**. Sin ese porqué la fila no vale.
- `heredada` — estaba en el repo antes de esta regla (2026-09-01) y aún no pasó los cuatro
  checks. No bloquea el gate; se resuelve en la feature de auditoría del board.

## Registro

En un repo nuevo la tabla arranca vacia y se llena a partir del primer `package.json`:
siembra una fila por dependencia ya instalada con estado `heredada` y audítalas despues.

| Paquete | Para qué | Estado | Fecha | Notas |
| --- | --- | --- | --- | --- |
