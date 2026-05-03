import { z } from "zod";

const nameSchema = z
  .string()
  .trim()
  .min(1, "Campo obrigatorio.")
  .max(80, "Use ate 80 caracteres.");

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Email invalido.")
  .max(255, "Email muito longo.");

const passwordSchema = z
  .string()
  .min(8, "Senha deve ter no minimo 8 caracteres.")
  .max(128, "Senha deve ter no maximo 128 caracteres.");

const birthDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data invalida.")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(`${value}T00:00:00.000Z`);
    const today = new Date();
    today.setUTCHours(23, 59, 59, 999);

    return (
      !Number.isNaN(date.getTime()) &&
      date.getUTCFullYear() === year &&
      date.getUTCMonth() + 1 === month &&
      date.getUTCDate() === day &&
      date <= today
    );
  }, "Data de nascimento invalida.");

const imageUrlSchema = z.string().max(1_500_000, "Imagem muito pesada.").nullable();

export const registerSchema = z
  .object({
    firstName: nameSchema,
    lastName: nameSchema,
    birthDate: birthDateSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirme a senha.")
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas precisam ser iguais."
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Senha obrigatoria.")
});

export const profileUpdateSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  birthDate: birthDateSchema,
  email: emailSchema,
  imageUrl: imageUrlSchema.optional()
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export function toFieldErrors(error: z.ZodError) {
  return error.issues.reduce<Record<string, string>>((errors, issue) => {
    const key = String(issue.path[0] ?? "form");

    if (!errors[key]) {
      errors[key] = issue.message;
    }

    return errors;
  }, {});
}
