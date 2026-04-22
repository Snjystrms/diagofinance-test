"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/contexts/auth-context";
import { getBreadcrumbItems } from "@/lib/app-route-registry";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function DashboardBreadcrumbs() {
  const pathname = usePathname();
  const { user } = useAuth();

  const items = getBreadcrumbItems(pathname ?? "/dashboard", user?.type);

  if (
    !items.length ||
    !user?.type ||
    !["user", "admin", "manager", "subadmin"].includes(user.type)
  ) {
    return null;
  }

  return (
    <div className="border-b bg-background/80 px-4 py-3 sm:px-5 md:px-6">
      <Breadcrumb>
        <BreadcrumbList>
          {items.map((item, index) => {
            const isLast = index === items.length - 1;

            return (
              <Fragment key={`${item.title}-${index}`}>
                {index > 0 ? <BreadcrumbSeparator /> : null}
                <BreadcrumbItem>
                  {isLast || !item.url ? (
                    <BreadcrumbPage className="font-medium">{item.title}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={item.url}>{item.title}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
