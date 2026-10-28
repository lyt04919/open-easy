/**
 * Tech Stack Presets and Official Brand Color Definitions
 */

export const TECH_PRESETS = [
  { name: 'Vue', label: 'Vue.js', gradient: 'linear-gradient(135deg, #42b883, #35495e)' },
  { name: 'React', label: 'React', gradient: 'linear-gradient(135deg, #20232a, #0f172a)' },
  { name: 'Next', label: 'Next.js', gradient: 'linear-gradient(135deg, #1f2937, #111827)' },
  { name: 'Python', label: 'Python', gradient: 'linear-gradient(135deg, #3776ab, #1e415f)' },
  { name: 'Java', label: 'Java', gradient: 'linear-gradient(135deg, #f59e0b, #b45309)' },
  { name: 'Spring', label: 'Spring Boot', gradient: 'linear-gradient(135deg, #15803d, #14532d)' },
  { name: 'Node', label: 'Node.js', gradient: 'linear-gradient(135deg, #22c55e, #15803d)' },
  { name: 'Go', label: 'Go (Golang)', gradient: 'linear-gradient(135deg, #0284c7, #0369a1)' },
  { name: 'Rust', label: 'Rust', gradient: 'linear-gradient(135deg, #ea580c, #9a3412)' },
  { name: 'Docker', label: 'Docker', gradient: 'linear-gradient(135deg, #0284c7, #075985)' },
  { name: 'Kubernetes', label: 'K8s', gradient: 'linear-gradient(135deg, #2563eb, #1e40af)' },
  { name: 'Redis', label: 'Redis', gradient: 'linear-gradient(135deg, #dc2626, #991b1b)' },
  { name: 'MySQL', label: 'MySQL', gradient: 'linear-gradient(135deg, #0284c7, #1e3a8a)' },
  { name: 'Postgres', label: 'PostgreSQL', gradient: 'linear-gradient(135deg, #336791, #1e3a8a)' },
  { name: 'AI', label: 'AI / LLM', gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }
];

/**
 * Maps a tech stack name to its official brand gradient background
 * @param {string} tech 
 * @returns {string} CSS linear-gradient
 */
export function getTechGradient(tech) {
  if (!tech) return 'linear-gradient(135deg, #0284c7, #075985)';
  const n = tech.trim().toLowerCase();
  if (n.includes('vue')) return 'linear-gradient(135deg, #42b883, #35495e)';
  if (n.includes('react')) return 'linear-gradient(135deg, #20232a, #0f172a)';
  if (n.includes('next')) return 'linear-gradient(135deg, #1f2937, #111827)';
  if (n.includes('python') || n === 'py') return 'linear-gradient(135deg, #3776ab, #1e415f)';
  if (n.includes('spring')) return 'linear-gradient(135deg, #15803d, #14532d)';
  if (n.includes('java')) return 'linear-gradient(135deg, #f59e0b, #b45309)';
  if (n.includes('node')) return 'linear-gradient(135deg, #22c55e, #15803d)';
  if (n.includes('golang') || n === 'go') return 'linear-gradient(135deg, #0284c7, #0369a1)';
  if (n.includes('rust')) return 'linear-gradient(135deg, #ea580c, #9a3412)';
  if (n.includes('k8s') || n.includes('kube') || n.includes('kubernetes')) return 'linear-gradient(135deg, #2563eb, #1e40af)';
  if (n.includes('redis')) return 'linear-gradient(135deg, #dc2626, #991b1b)';
  if (n.includes('mysql')) return 'linear-gradient(135deg, #0284c7, #1e3a8a)';
  if (n.includes('postgres')) return 'linear-gradient(135deg, #336791, #1e3a8a)';
  if (n.includes('ai') || n.includes('llm') || n.includes('gpt')) return 'linear-gradient(135deg, #8b5cf6, #6d28d9)';
  if (n.includes('docker')) return 'linear-gradient(135deg, #0284c7, #075985)';
  return 'linear-gradient(135deg, #0284c7, #075985)';
}
