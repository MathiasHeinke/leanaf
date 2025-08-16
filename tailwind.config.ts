import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

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
			fontFamily: {
				sans: ['InterVariable', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
				display: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
			},
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
				mindset: 'hsl(var(--mindset))',
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
			fontSize: {
				'xs': ['clamp(0.7rem, 0.5rem + 0.5vw, 0.75rem)', { lineHeight: '1rem' }],
				'sm': ['clamp(0.8rem, 0.6rem + 0.5vw, 0.875rem)', { lineHeight: '1.25rem' }],
				'base': ['clamp(0.9rem, 0.7rem + 0.5vw, 1rem)', { lineHeight: '1.5rem' }],
				'lg': ['clamp(1rem, 0.8rem + 0.6vw, 1.125rem)', { lineHeight: '1.75rem' }],
				'xl': ['clamp(1.1rem, 0.9rem + 0.7vw, 1.25rem)', { lineHeight: '1.75rem' }],
				'2xl': ['clamp(1.3rem, 1rem + 0.8vw, 1.5rem)', { lineHeight: '2rem' }],
				'3xl': ['clamp(1.6rem, 1.2rem + 1vw, 1.875rem)', { lineHeight: '2.25rem' }],
				'4xl': ['clamp(2rem, 1.5rem + 1.2vw, 2.25rem)', { lineHeight: '2.5rem' }],
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
				'slide-in-right': {
					'0%': {
						transform: 'translateX(100%)',
						opacity: '0'
					},
					'100%': {
						transform: 'translateX(0)',
						opacity: '1'
					}
				},
				'slide-out-right': {
					'0%': {
						transform: 'translateX(0)',
						opacity: '1'
					},
					'100%': {
						transform: 'translateX(100%)',
						opacity: '0'
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
					'0%': {
						transform: 'translate(0, 0) scale(1)'
					},
					'25%': {
						transform: 'translate(80vw, 20vh) scale(1.2)'
					},
					'50%': {
						transform: 'translate(60vw, 80vh) scale(0.8)'
					},
					'75%': {
						transform: 'translate(-20vw, 60vh) scale(1.1)'
					},
					'100%': {
						transform: 'translate(0, 0) scale(1)'
					}
				},
				'float-2': {
					'0%': {
						transform: 'translate(0, 0) scale(1)'
					},
					'33%': {
						transform: 'translate(-30vw, 70vh) scale(1.3)'
					},
					'66%': {
						transform: 'translate(70vw, 30vh) scale(0.7)'
					},
					'100%': {
						transform: 'translate(0, 0) scale(1)'
					}
				},
				'float-3': {
					'0%': {
						transform: 'translate(0, 0) scale(1)'
					},
					'20%': {
						transform: 'translate(50vw, -10vh) scale(0.9)'
					},
					'60%': {
						transform: 'translate(-40vw, 50vh) scale(1.4)'
					},
					'80%': {
						transform: 'translate(30vw, 90vh) scale(0.6)'
					},
					'100%': {
						transform: 'translate(0, 0) scale(1)'
					}
				},
				'float-4': {
					'0%': {
						transform: 'translate(0, 0) scale(1) rotate(0deg)'
					},
					'40%': {
						transform: 'translate(-50vw, 40vh) scale(1.1) rotate(180deg)'
					},
					'80%': {
						transform: 'translate(90vw, 70vh) scale(0.8) rotate(360deg)'
					},
					'100%': {
						transform: 'translate(0, 0) scale(1) rotate(0deg)'
					}
				},
				'float-5': {
					'0%': {
						transform: 'translate(0, 0) scale(1) rotate(0deg)'
					},
					'30%': {
						transform: 'translate(40vw, 80vh) scale(1.2) rotate(120deg)'
					},
					'70%': {
						transform: 'translate(-60vw, 20vh) scale(0.9) rotate(240deg)'
					},
					'100%': {
						transform: 'translate(0, 0) scale(1) rotate(360deg)'
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
				'slide-in-right': 'slide-in-right 0.3s ease-out',
				'slide-out-right': 'slide-out-right 0.3s ease-out',
				'glow': 'glow 2s ease-in-out infinite',
				'float-1': 'float-1 25s ease-in-out infinite',
				'float-2': 'float-2 30s ease-in-out infinite',
				'float-3': 'float-3 35s ease-in-out infinite',
				'float-4': 'float-4 40s ease-in-out infinite',
				'float-5': 'float-5 45s ease-in-out infinite'
			}
		}
	},
	plugins: [tailwindcssAnimate],
} satisfies Config;
