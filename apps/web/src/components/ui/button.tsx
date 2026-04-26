import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        default:     'gradient-primary text-white shadow-sm hover:opacity-90',
        destructive: 'bg-destructive text-white hover:bg-destructive/90 shadow-sm',
        outline:     'border border-border bg-white text-foreground hover:bg-secondary',
        secondary:   'bg-secondary text-secondary-foreground hover:bg-secondary/70',
        ghost:       'text-foreground hover:bg-secondary',
        link:        'text-primary underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        default: 'h-9 px-4',
        sm:      'h-8 px-3 text-xs',
        lg:      'h-11 px-6 text-base',
        icon:    'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export function Button({ className, variant, size, asChild = false, loading, children, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <>
          <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
          {children}
        </>
      ) : children}
    </Comp>
  );
}
