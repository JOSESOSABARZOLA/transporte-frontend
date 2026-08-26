import { type FC } from "react";
import { useUser } from "../../hooks/useUser";

type PerfilUsuarioBotonProps = {
  onClick: () => void;
};

const UserProfileButton: FC<PerfilUsuarioBotonProps> = ({ onClick }) => {
  const { user } = useUser();

  // Extraer iniciales de usuFullName (ej: "Doris Villavicencio" -> "DV")
  const abreviaturaPerfil = user?.usuFullName
    ? user.usuFullName
      .split(' ')
      .map(palabra => palabra[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
    : 'U';

  return (
    <div
      className="avatar avatar-online avatar-placeholder ml-2 cursor-pointer"
      onClick={onClick}
    >
      <div className="bg-primary text-primary-content w-8 rounded-full">
        <span className="text-xs">{abreviaturaPerfil}</span>
      </div>
    </div>
  );
};

export default UserProfileButton;
