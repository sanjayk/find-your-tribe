import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from './card';

describe('Card', () => {
  it('renders without crashing', () => {
    render(<Card />);
  });

  it('renders children content', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('has the correct data-slot attribute', () => {
    const { container } = render(<Card />);
    expect(container.querySelector('[data-slot="card"]')).toBeInTheDocument();
  });

  it('forwards custom className', () => {
    const { container } = render(<Card className="custom-card" />);
    const el = container.querySelector('[data-slot="card"]');
    expect(el).toHaveClass('custom-card');
  });

  it('renders as a div element', () => {
    const { container } = render(<Card />);
    const el = container.querySelector('[data-slot="card"]');
    expect(el?.tagName).toBe('DIV');
  });
});

describe('CardHeader', () => {
  it('renders without crashing', () => {
    render(<CardHeader />);
  });

  it('renders children content', () => {
    render(<CardHeader>Header text</CardHeader>);
    expect(screen.getByText('Header text')).toBeInTheDocument();
  });

  it('has the correct data-slot attribute', () => {
    const { container } = render(<CardHeader />);
    expect(container.querySelector('[data-slot="card-header"]')).toBeInTheDocument();
  });

  it('forwards custom className', () => {
    const { container } = render(<CardHeader className="header-class" />);
    const el = container.querySelector('[data-slot="card-header"]');
    expect(el).toHaveClass('header-class');
  });
});

describe('CardTitle', () => {
  it('renders without crashing', () => {
    render(<CardTitle />);
  });

  it('renders title text', () => {
    render(<CardTitle>My Title</CardTitle>);
    expect(screen.getByText('My Title')).toBeInTheDocument();
  });

  it('has the correct data-slot attribute', () => {
    const { container } = render(<CardTitle />);
    expect(container.querySelector('[data-slot="card-title"]')).toBeInTheDocument();
  });

  it('forwards custom className', () => {
    const { container } = render(<CardTitle className="title-class" />);
    const el = container.querySelector('[data-slot="card-title"]');
    expect(el).toHaveClass('title-class');
  });
});

describe('CardDescription', () => {
  it('renders without crashing', () => {
    render(<CardDescription />);
  });

  it('renders description text', () => {
    render(<CardDescription>Some description</CardDescription>);
    expect(screen.getByText('Some description')).toBeInTheDocument();
  });

  it('has the correct data-slot attribute', () => {
    const { container } = render(<CardDescription />);
    expect(container.querySelector('[data-slot="card-description"]')).toBeInTheDocument();
  });

  it('forwards custom className', () => {
    const { container } = render(<CardDescription className="desc-class" />);
    const el = container.querySelector('[data-slot="card-description"]');
    expect(el).toHaveClass('desc-class');
  });
});

describe('CardAction', () => {
  it('renders without crashing', () => {
    render(<CardAction />);
  });

  it('renders children content', () => {
    render(<CardAction>Action button</CardAction>);
    expect(screen.getByText('Action button')).toBeInTheDocument();
  });

  it('has the correct data-slot attribute', () => {
    const { container } = render(<CardAction />);
    expect(container.querySelector('[data-slot="card-action"]')).toBeInTheDocument();
  });

  it('forwards custom className', () => {
    const { container } = render(<CardAction className="action-class" />);
    const el = container.querySelector('[data-slot="card-action"]');
    expect(el).toHaveClass('action-class');
  });
});

describe('CardContent', () => {
  it('renders without crashing', () => {
    render(<CardContent />);
  });

  it('renders children content', () => {
    render(<CardContent>Content area</CardContent>);
    expect(screen.getByText('Content area')).toBeInTheDocument();
  });

  it('has the correct data-slot attribute', () => {
    const { container } = render(<CardContent />);
    expect(container.querySelector('[data-slot="card-content"]')).toBeInTheDocument();
  });

  it('forwards custom className', () => {
    const { container } = render(<CardContent className="content-class" />);
    const el = container.querySelector('[data-slot="card-content"]');
    expect(el).toHaveClass('content-class');
  });
});

describe('CardFooter', () => {
  it('renders without crashing', () => {
    render(<CardFooter />);
  });

  it('renders children content', () => {
    render(<CardFooter>Footer text</CardFooter>);
    expect(screen.getByText('Footer text')).toBeInTheDocument();
  });

  it('has the correct data-slot attribute', () => {
    const { container } = render(<CardFooter />);
    expect(container.querySelector('[data-slot="card-footer"]')).toBeInTheDocument();
  });

  it('forwards custom className', () => {
    const { container } = render(<CardFooter className="footer-class" />);
    const el = container.querySelector('[data-slot="card-footer"]');
    expect(el).toHaveClass('footer-class');
  });
});

describe('Card composition', () => {
  it('renders a full card with all sub-components', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Project Title</CardTitle>
          <CardDescription>A great project</CardDescription>
          <CardAction>Edit</CardAction>
        </CardHeader>
        <CardContent>Main content here</CardContent>
        <CardFooter>Published 2024</CardFooter>
      </Card>,
    );

    expect(screen.getByText('Project Title')).toBeInTheDocument();
    expect(screen.getByText('A great project')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Main content here')).toBeInTheDocument();
    expect(screen.getByText('Published 2024')).toBeInTheDocument();
  });
});
