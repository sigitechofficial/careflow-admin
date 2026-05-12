import type { Meta, StoryObj } from '@storybook/react'
import { Plus, Download, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'outline', 'ghost', 'destructive', 'success', 'warning', 'subtle', 'link'],
    },
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg', 'xl', 'icon', 'icon-sm', 'icon-lg'],
    },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { children: 'Button' },
}

export const Primary: Story = {
  args: { variant: 'default', children: 'Save Changes' },
}

export const WithIcon: Story = {
  args: {
    variant: 'default',
    children: 'Add Service User',
    leftIcon: <Plus className="h-4 w-4" />,
  },
}

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Delete Record',
    leftIcon: <Trash2 className="h-4 w-4" />,
  },
}

export const Loading: Story = {
  args: { loading: true, children: 'Saving...' },
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {(['default', 'secondary', 'outline', 'ghost', 'destructive', 'success', 'warning', 'subtle'] as const).map((v) => (
        <Button key={v} variant={v}>{v}</Button>
      ))}
    </div>
  ),
}
