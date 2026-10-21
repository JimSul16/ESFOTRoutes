import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { createUser, updateUser } from '../../../api/admin.api';
import { getApiErrorMessage } from '../../../api/errors';
import type { User } from '../../../types';

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
      .refine((val) => val.endsWith("@epn.edu.ec"), {
        message: "Usa un correo institucional (@epn.edu.ec)",
      }),
    password: userToEdit 
      ? z.string().optional() 
      : z.string().min(8, "Mínimo 8 caracteres"),
    roleName: z.enum(["STUDENT", "ADMIN"])
  });

  type UserFormValues = z.infer<typeof userSchema>;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      roleName: 'STUDENT'
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
      });
    } else {
      reset({
        name: '',
        email: '',
        password: '',
        roleName: 'STUDENT',
      });
    }
  }, [userToEdit, reset]);

  const onSubmit = async (dataForm: UserFormValues) => {
    try {
      if (userToEdit) {
        const res = await updateUser(userToEdit.id, {
          name: dataForm.name,
          email: dataForm.email,
          password: dataForm.password,
          roleName: dataForm.roleName,
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
          email: dataForm.email,
          password: dataForm.password,
          roleName: dataForm.roleName,
        });
        toast.success(res.message);
      }
      onClose();
    } catch (error: unknown) {
      // Antes el fallo solo llegaba a la consola: el modal se cerraba igual y
      // el admin veía un "éxito" mudo aunque el usuario no se hubiera creado.
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1">Nombre</label>
            <input
              type="text"
              className={`w-full rounded-xl bg-surface-50 dark:bg-surface-800 border ${errors.name ? 'border-red-500' : 'border-surface-200 dark:border-surface-700'} text-surface-900 dark:text-white p-2.5 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm`}
              {...register("name")}
            />
            {errors.name && <p className="text-rose-500 dark:text-rose-400 text-xs mt-1.5 font-medium">{errors.name.message}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1">Correo Institucional</label>
            <input
              type="email"
              className={`w-full rounded-xl bg-surface-50 dark:bg-surface-800 border ${errors.email ? 'border-red-500' : 'border-surface-200 dark:border-surface-700'} text-surface-900 dark:text-white p-2.5 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm`}
              {...register("email")}
            />
            {errors.email && <p className="text-rose-500 dark:text-rose-400 text-xs mt-1.5 font-medium">{errors.email.message}</p>}
          </div>
          
            <>
              <div>
                <label className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1">Contraseña</label>
                <input
                  type="password"
                  className={`w-full rounded-xl bg-surface-50 dark:bg-surface-800 border ${errors.password ? 'border-red-500' : 'border-surface-200 dark:border-surface-700'} text-surface-900 dark:text-white p-2.5 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm`}
                  {...register("password")}
                />
                {errors.password && <p className="text-rose-500 dark:text-rose-400 text-xs mt-1.5 font-medium">{errors.password.message}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1">Rol</label>
                <select
                  className={`w-full rounded-xl bg-surface-50 dark:bg-surface-800 border ${errors.roleName ? 'border-red-500' : 'border-surface-200 dark:border-surface-700'} text-surface-900 dark:text-white p-2.5 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all appearance-none text-sm`}
                  {...register("roleName")}
                >
                  <option value="STUDENT">Estudiante</option>
                  <option value="ADMIN">Administrador</option>
                </select>
                {errors.roleName && <p className="text-rose-500 dark:text-rose-400 text-xs mt-1.5 font-medium">{errors.roleName.message}</p>}
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