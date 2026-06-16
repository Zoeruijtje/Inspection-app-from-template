# Deployment

## Default deployment target

Railway is the preferred first deployment target for this Open SaaS/Wasp factory because it can host the full-stack app and database together.

## DNS

Use Cloudflare for DNS and custom domains.

## Deployment rules

- Do not deploy broken main branch.
- Make sure local app runs before deployment.
- Check environment variables before deploy.
- Use test Stripe keys until payment flow is confirmed.
- Production secrets belong in Railway/hosting provider, not Git.

## Future deployment command

From app folder:
wasp deploy railway launch <project-name>
