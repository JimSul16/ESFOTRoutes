import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { createUser, updateUser } from '../../../api/admin.api';
import { getApiErrorMessage } from '../../../api/errors';
import {
  ALLOWED_EMAIL_DOMAIN_ERROR,
  ALLOWED_EMAIL_DOMAINS_TEXT,
  isAllowedEmailDomain,
  normalizeEmail,
} from '../../../utils/email';
import { type User, CAREERS, SEMESTERS } from '../../../types';

export interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit: User | null;
}

const UserFormModal = ({ isOpen, onClose, userToEdit }: UserFormModalProps) => {
  
  const userSchema = z.object({
    name: z.string().min(2, "El nombre es obligatorio"),
    email: z
      .string()
      .min(1, "El correo es obligatorio")
      .email("Correo inválido")
      // Se admiten los mismos dominios que el backend (`auth.controller.js`):
      // el institucional de la EPN y Gmail. Antes solo se aceptaba
      // `@epn.edu.ec`, así que el admin no podía dar de alta a un usuario con
      // correo personal pese a que el registro público sí lo permitía.
      .refine(isAllowedEmailDomain, {
        message: ALLOWED_EMAIL_DOMAIN_ERROR,
      }),
    password: userToEdit 
      ? z.string().optional() 
      : z.string().min(8, "Mínimo 8 caracteres"),
    roleName: z.enum(["STUDENT", "ADMIN"]),
    career: z.string().min(3, "La carrera es obligatoria"),
    semester: z.number().int().min(1, "Semestre entre 1 y 5").max(5, "Semestre entre 1 y 5"),
    uniqueId: z.string().regex(/^\d{9}$/, "El ID único EPN debe tener exactamente 9 dígitos"),
  });

  type UserFormValues = z.infer<typeof userSchema>;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      roleName: 'STUDENT',
      career: CAREERS[0],
      semester: 1,
      uniqueId: '',
    }
  });

  useEffect(() => {
    if (userToEdit) {
      reset({
        name: userToEdit.name,
        email: userToEdit.email,
        password: '',
        // `roles` es string[]; solo 'STUDENT' y 'ADMIN' son válidos para el enum.
        roleName: userToEdit.roles[0] === 'ADMIN' ? 'ADMIN' : 'STUDENT',
        career: userToEdit.career || CAREERS[0],
        semester: userToEdit.semester || 1,
        uniqueId: userToEdit.uniqueId || '',
      });
    } else {
      reset({
        name: '',
        email: '',
        password: '',
        roleName: 'STUDENT',
        career: CAREERS[0],
        semester: 1,
        uniqueId: '',
      });
    }
  }, [userToEdit, reset]);

  const onSubmit = async (dataForm: UserFormValues) => {
    // Se normaliza el correo (recortar + minúsculas) antes de mandarlo: la
    // columna `User.email` es UNIQUE y SQLite compara TEXT distinguiendo
    // mayúsculas, así que `Ana@Gmail.com` y `ana@gmail.com` serían dos
    // usuarios distintos y el segundo no podría iniciar sesión.
    const email = normalizeEmail(dataForm.email);
    const uniqueId = dataForm.uniqueId.trim();

    try {
      if (userToEdit) {
        const res = await updateUser(userToEdit.id, {
          name: dataForm.name,
          email,
          password: dataForm.password,
          roleName: dataForm.roleName,
          career: dataForm.career,
          semester: dataForm.semester,
          uniqueId,
        });
        toast.success(res.message);
      } else {
        // El esquema hace la contraseña opcional cuando se edita, así que en
        // la rama de alta hay que descartar el `undefined` explícitamente.
        if (!dataForm.password) {
          toast.error('La contraseña es obligatoria al crear un usuario.');
          return;
        }

        const res = await createUser({
          name: dataForm.name,
          email,
          password: dataForm.password,
          roleName: dataForm.roleName,
          career: dataForm.career,
          semester: dataForm.semester,
          uniqueId,
        });
        toast.success(res.message);
      }
      onClose();
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        (error as { response?: { status?: number } }).response?.status === 409
      ) {
        toast.error('Este ID único ya está registrado.');
        return;
      }
      toast.error(getApiErrorMessage(error, 'No se pudo guardar el usuario.'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-50">
      <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-surface-200 dark:border-surface-800 animate-in fade-in zoom-in-95 duration-200">
        <h2 className="text-xl font-display font-bold mb-4 text-surface-900 dark:text-white">
          {userToEdit ? 'Editar Usuario' : 'Crear Usuario'}
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div>
            <label htmlFor="user-name" className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1">Nombre</label>
            <input
              id="user-name"
              type="text"
              className={`w-full rounded-xl bg-surface-50 dark:bg-surface-800 border ${errors.name ? 'border-red-500' : 'border-surface-200 dark:border-surface-700'} text-surface-900 dark:text-white p-2.5 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm`}
              {...register("name")}
            />
            {errors.name && <p className="text-brand-500 dark:text-brand-400 text-xs mt-1.5 font-medium">{errors.name.message}</p>}
          </div>
          
          <div>
            <label htmlFor="user-email" className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1">Correo Electrónico</label>
            <input
              id="user-email"
              type="email"
              placeholder="usuario@epn.edu.ec"
              className={`w-full rounded-xl bg-surface-50 dark:bg-surface-800 border ${errors.email ? 'border-red-500' : 'border-surface-200 dark:border-surface-700'} text-surface-900 dark:text-white p-2.5 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm`}
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-brand-500 dark:text-brand-400 text-xs mt-1.5 font-medium">{errors.email.message}</p>
            ) : (
              <p className="text-surface-400 dark:text-surface-500 text-xs mt-1.5">
                Dominios permitidos: {ALLOWED_EMAIL_DOMAINS_TEXT}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="user-uniqueId" className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1">ID Único EPN (9 dígitos)</label>
            <input
              id="user-uniqueId"
              type="text"
              maxLength={9}
              placeholder="123456789"
              className={`w-full rounded-xl bg-surface-50 dark:bg-surface-800 border ${errors.uniqueId ? 'border-red-500' : 'border-surface-200 dark:border-surface-700'} text-surface-900 dark:text-white p-2.5 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm`}
              {...register("uniqueId")}
            />
            {errors.uniqueId && <p className="text-brand-500 dark:text-brand-400 text-xs mt-1.5 font-medium">{errors.uniqueId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="user-career" className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1">Carrera</label>
              <select
                id="user-career"
                className={`w-full rounded-xl bg-surface-50 dark:bg-surface-800 border ${errors.career ? 'border-red-500' : 'border-surface-200 dark:border-surface-700'} text-surface-900 dark:text-white p-2.5 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all appearance-none text-sm`}
                {...register("career")}
              >
                {CAREERS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {errors.career && <p className="text-brand-500 dark:text-brand-400 text-xs mt-1.5 font-medium">{errors.career.message}</p>}
            </div>

            <div>
              <label htmlFor="user-semester" className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1">Semestre</label>
              <select
                id="user-semester"
                className={`w-full rounded-xl bg-surface-50 dark:bg-surface-800 border ${errors.semester ? 'border-red-500' : 'border-surface-200 dark:border-surface-700'} text-surface-900 dark:text-white p-2.5 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all appearance-none text-sm`}
                {...register("semester", { valueAsNumber: true })}
              >
                {SEMESTERS.map((s) => (
                  <option key={s} value={s}>{s}° Semestre</option>
                ))}
              </select>
              {errors.semester && <p className="text-brand-500 dark:text-brand-400 text-xs mt-1.5 font-medium">{errors.semester.message}</p>}
            </div>
          </div>
          
            <>
              <div>
                <label htmlFor="user-password" className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1">Contraseña</label>
                <input
                  id="user-password"
                  type="password"
                  className={`w-full rounded-xl bg-surface-50 dark:bg-surface-800 border ${errors.password ? 'border-red-500' : 'border-surface-200 dark:border-surface-700'} text-surface-900 dark:text-white p-2.5 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm`}
                  {...register("password")}
                />
                {errors.password && <p className="text-brand-500 dark:text-brand-400 text-xs mt-1.5 font-medium">{errors.password.message}</p>}
              </div>
              
              <div>
                <label htmlFor="user-role" className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1">Rol</label>
                <select
                  id="user-role"
                  className={`w-full rounded-xl bg-surface-50 dark:bg-surface-800 border ${errors.roleName ? 'border-red-500' : 'border-surface-200 dark:border-surface-700'} text-surface-900 dark:text-white p-2.5 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all appearance-none text-sm`}
                  {...register("roleName")}
                >
                  <option value="STUDENT">Estudiante</option>
                  <option value="ADMIN">Administrador</option>
                </select>
                {errors.roleName && <p className="text-brand-500 dark:text-brand-400 text-xs mt-1.5 font-medium">{errors.roleName.message}</p>}
              </div>
            </>
          
          <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-surface-200 dark:border-surface-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-surface-600 dark:text-surface-300 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors font-medium text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-500 transition-all shadow-md shadow-brand-600/20 font-semibold text-sm hover:scale-[1.02] active:scale-[0.98]"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;