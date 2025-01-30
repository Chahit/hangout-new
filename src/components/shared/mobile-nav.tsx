import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, MessageCircle, User } from "lucide-react";

const navItems = [
  {
    path: "/",
    label: "Home",
    icon: Home,
  },
  {
    path: "/groups",
    label: "Groups",
    icon: Users,
  },
  {
    path: "/messages",
    label: "Messages",
    icon: MessageCircle,
  },
  {
    path: "/profile",
    label: "Profile",
    icon: User,
  },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.path;

        return (
          <Link
            key={item.path}
            href={item.path}
            className={`mobile-nav-item ${isActive ? "active" : ""}`}
          >
            <Icon className="w-6 h-6" />
            <span className="text-xs">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
} 