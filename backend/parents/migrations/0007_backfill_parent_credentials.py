from django.db import migrations


def _fill_default_credentials(apps, schema_editor):
    ParentGuardian = apps.get_model('parents', 'ParentGuardian')
    # Select records missing username or password
    qs = ParentGuardian.objects.filter(
        
        # username blank or null OR password blank or null
        (migrations.models.Q(username__isnull=True) | migrations.models.Q(username=''))
        | (migrations.models.Q(password__isnull=True) | migrations.models.Q(password=''))
    )

    # Note: Using the historical model via apps.get_model
    for p in qs:
        name_parts = (p.name or '').strip().split()
        base = name_parts[-1] if len(name_parts) else 'parent'
        candidate = base
        suffix = 1
        # ensure we don't collide
        while ParentGuardian.objects.filter(username=candidate).exclude(pk=p.pk).exists():
            candidate = f"{base}{suffix}"
            suffix += 1
        if not p.username or str(p.username).strip() == '':
            p.username = candidate
        if not p.password or str(p.password).strip() == '':
            p.password = f"{p.username}123"
        p.must_change_credentials = True
        p.save()


def _noop_reverse(apps, schema_editor):
    # Nothing to do on reverse; leave credentials as-is
    return


class Migration(migrations.Migration):

    dependencies = [
        ('parents', '0006_parentguardian_must_change_credentials'),
    ]

    operations = [
        migrations.RunPython(_fill_default_credentials, _noop_reverse),
    ]
