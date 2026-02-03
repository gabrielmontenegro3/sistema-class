import { Link } from 'react-router-dom'
import { Button, Page } from '../components/ui'

export function NotFoundPage() {
  return (
    <Page title="Página não encontrada" description="A rota acessada não existe.">
      <Link to="/">
        <Button>Voltar ao dashboard</Button>
      </Link>
    </Page>
  )
}

