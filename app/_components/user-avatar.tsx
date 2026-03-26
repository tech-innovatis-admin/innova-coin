import Image from "next/image";

type UserAvatarProps = {
  name: string;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "h-10 w-10 text-sm",
  md: "h-12 w-12 text-base",
  lg: "h-16 w-16 text-lg",
};

export default function UserAvatar({
  name,
  photoUrl,
  size = "md",
  className = "",
}: UserAvatarProps) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";

  const avatarClassName = `inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-cyan-300/30 bg-cyan-300/15 font-semibold text-cyan-100 ${sizeClasses[size]} ${className}`.trim();

  if (photoUrl) {
    return (
      <div className={`relative ${avatarClassName}`}>
        <Image
          src={photoUrl}
          alt={`Foto de ${name}`}
          fill
          unoptimized
          sizes="64px"
          className="object-cover"
        />
      </div>
    );
  }

  return <div className={avatarClassName}>{initials}</div>;
}
