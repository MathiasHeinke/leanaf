import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					glow: 'hsl(var(--primary-glow))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				protein: {
					DEFAULT: 'hsl(var(--protein))',
					light: 'hsl(var(--protein-light))'
				},
				carbs: {
					DEFAULT: 'hsl(var(--carbs))',
					light: 'hsl(var(--carbs-light))'
				},
				fats: {
					DEFAULT: 'hsl(var(--fats))',
					light: 'hsl(var(--fats-light))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in': {
					'0%': {
						opacity: '0',
						transform: 'translateY(10px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'fade-out': {
					'0%': {
						opacity: '1',
						transform: 'translateY(0)'
					},
					'100%': {
						opacity: '0',
						transform: 'translateY(10px)'
					}
				},
				'scale-in': {
					'0%': {
						transform: 'scale(0.95)',
						opacity: '0'
					},
					'100%': {
						transform: 'scale(1)',
						opacity: '1'
					}
				},
				'slide-up': {
					'0%': {
						transform: 'translateY(100%)',
						opacity: '0'
					},
					'100%': {
						transform: 'translateY(0)',
						opacity: '1'
					}
				},
				'glow': {
					'0%, 100%': {
						boxShadow: '0 0 5px hsl(var(--primary) / 0.5)'
					},
					'50%': {
						boxShadow: '0 0 20px hsl(var(--primary) / 0.8)'
					}
				},
				'float-1': {
					'0%, 100%': {
						transform: 'translate(0, 0) scale(1)'
					},
					'33%': {
						transform: 'translate(20px, -15px) scale(1.1)'
					},
					'66%': {
						transform: 'translate(-15px, 10px) scale(0.9)'
					}
				},
				'float-2': {
					'0%, 100%': {
						transform: 'translate(0, 0) scale(1)'
					},
					'25%': {
						transform: 'translate(-25px, 20px) scale(1.2)'
					},
					'75%': {
						transform: 'translate(30px, -10px) scale(0.8)'
					}
				},
				'float-3': {
					'0%, 100%': {
						transform: 'translate(0, 0) scale(1)'
					},
					'40%': {
						transform: 'translate(15px, 25px) scale(0.85)'
					},
					'80%': {
						transform: 'translate(-20px, -15px) scale(1.15)'
					}
				},
				'float-4': {
					'0%, 100%': {
						transform: 'translate(0, 0) scale(1)'
					},
					'30%': {
						transform: 'translate(-10px, -20px) scale(1.05)'
					},
					'70%': {
						transform: 'translate(25px, 15px) scale(0.95)'
					}
				},
				'float-5': {
					'0%, 100%': {
						transform: 'translate(0, 0) scale(1) rotate(0deg)'
					},
					'50%': {
						transform: 'translate(10px, -30px) scale(1.1) rotate(180deg)'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'fade-out': 'fade-out 0.3s ease-out',
				'scale-in': 'scale-in 0.2s ease-out',
				'slide-up': 'slide-up 0.3s ease-out',
				'glow': 'glow 2s ease-in-out infinite',
				'float-1': 'float-1 8s ease-in-out infinite',
				'float-2': 'float-2 12s ease-in-out infinite',
				'float-3': 'float-3 10s ease-in-out infinite',
				'float-4': 'float-4 14s ease-in-out infinite',
				'float-5': 'float-5 16s ease-in-out infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
