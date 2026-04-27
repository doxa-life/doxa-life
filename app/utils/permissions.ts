// Central permission registry.
//
// When porting to nuxt-blueprints, each block ships a `permissions.ts` fragment
// and blueprint assembly merges the fragments into this file. Consumer projects
// own this file and are free to edit it.
export const PERMISSIONS = [
  'admin.access',
  'users.view',
  'users.manage',
  'roles.view',
  'roles.manage',
  'pages.view',
  'pages.write',
  'pages.publish'
] as const

export type Permission = typeof PERMISSIONS[number]

// Optional: human-readable titles and descriptions shown in admin UI.
// Keys must match entries in PERMISSIONS. Missing entries fall back to the raw
// permission string.
export const PERMISSION_META: Record<string, { title: string; description: string }> = {
  'admin.access': {
    title: 'Access admin area',
    description: 'Required to reach /admin and see the admin shell.'
  },
  'users.view': {
    title: 'View users',
    description: 'See the users list.'
  },
  'users.manage': {
    title: 'Manage users',
    description: 'Edit, delete, and assign roles to other users (subject to the subset delegation rule).'
  },
  'roles.view': {
    title: 'View roles',
    description: 'See the roles reference page.'
  },
  'roles.manage': {
    title: 'Manage roles',
    description: 'Create, edit, and delete custom roles.'
  },
  'pages.view': {
    title: 'View CMS pages',
    description: 'See the CMS pages list and read existing translations.'
  },
  'pages.write': {
    title: 'Edit CMS pages',
    description: 'Create, edit, translate, and delete CMS pages, categories, and assets.'
  },
  'pages.publish': {
    title: 'Publish CMS pages',
    description: 'Publish and unpublish CMS pages.'
  }
}

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value)
}
