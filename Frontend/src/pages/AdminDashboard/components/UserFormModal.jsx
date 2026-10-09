import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createUser, updateUser } from '../../../api/admin.api';

const UserFormModal = ({ isOpen, onClose, userToEdit, token }) => {
  
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

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
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
        roleName: userToEdit.roles[0] || 'STUDENT'
      });
    } else {
      reset({
        name: '',
        email: '',
        password: '',
        roleName: 'STUDENT'
      });
    }
  }, [userToEdit, reset]);

  const onSubmit = async (dataForm) => {
    try {
      if (userToEdit) {
        await updateUser(userToEdit.id, { 
          name: dataForm.name, 
          email: dataForm.email,
          password: dataForm.password,
          roleName: dataForm.roleName
        }, token);
      } else {
        await createUser(dataForm, token);
      }
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-50">
      <div className="bg-[#1e2333] rounded-xl p-6 w-full max-w-md shadow-2xl border border-gray-700">
        <h2 className="text-xl font-bold mb-4 text-white">
          {userToEdit ? 'Editar Usuario' : 'Crear Usuario'}
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nombre</label>
            <input
              type="text"
              className={`w-full rounded-lg bg-[#161a26] border ${errors.name ? 'border-red-500' : 'border-gray-600'} text-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
              {...register("name")}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Correo Institucional</label>
            <input
              type="email"
              className={`w-full rounded-lg bg-[#161a26] border ${errors.email ? 'border-red-500' : 'border-gray-600'} text-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
              {...register("email")}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Contraseña</label>
                <input
                  type="password"
                  className={`w-full rounded-lg bg-[#161a26] border ${errors.password ? 'border-red-500' : 'border-gray-600'} text-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                  {...register("password")}
                />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Rol</label>
                <select
                  className={`w-full rounded-lg bg-[#161a26] border ${errors.roleName ? 'border-red-500' : 'border-gray-600'} text-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none`}
                  {...register("roleName")}
                >
                  <option value="STUDENT">Estudiante</option>
                  <option value="ADMIN">Administrador</option>
                </select>
                {errors.roleName && <p className="text-red-500 text-xs mt-1">{errors.roleName.message}</p>}
              </div>
            </>
          
          <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-transparent text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
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