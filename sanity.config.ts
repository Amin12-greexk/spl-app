import { defineConfig } from 'sanity'
import { deskTool } from 'sanity/desk'

export default defineConfig({
  name: 'default',
  title: 'SPL App Admin',

  projectId: 'e2bkxwbs',
  dataset: 'production',

  basePath: '/dashboard/admin/sanity/studio',

  plugins: [deskTool()],

  schema: {
    types: [
      {
        name: 'announcement',
        title: 'Pengumuman',
        type: 'document',
        fields: [
          {
            name: 'title',
            title: 'Judul',
            type: 'string',
            validation: Rule => Rule.required()
          },
          {
            name: 'content',
            title: 'Isi Pengumuman',
            type: 'text',
            validation: Rule => Rule.required()
          },
          {
            name: 'date',
            title: 'Tanggal',
            type: 'datetime',
            initialValue: () => new Date().toISOString()
          },
          {
            name: 'active',
            title: 'Aktif',
            type: 'boolean',
            initialValue: true
          }
        ]
      }
    ],
  },
})
