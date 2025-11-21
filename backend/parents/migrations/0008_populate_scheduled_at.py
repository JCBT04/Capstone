from django.db import migrations
from django.utils import timezone


def populate_scheduled_at(apps, schema_editor):
    ParentEvent = apps.get_model('parents', 'ParentEvent')
    # For any existing ParentEvent with a null scheduled_at, set it to created_at
    # if available, otherwise use now(). This avoids picking an arbitrary default
    # during schema migration.
    now = timezone.now()
    qs = ParentEvent.objects.filter(scheduled_at__isnull=True)
    for ev in qs:
        try:
            if getattr(ev, 'created_at', None):
                ev.scheduled_at = ev.created_at
            else:
                ev.scheduled_at = now
            ev.save()
        except Exception:
            # best-effort: skip problematic rows to avoid failing the migration
            continue


def noop_reverse(apps, schema_editor):
    # No reverse operation required
    return


class Migration(migrations.Migration):

    dependencies = [
        ('parents', '0007_backfill_parent_credentials'),
    ]

    operations = [
        migrations.RunPython(populate_scheduled_at, noop_reverse),
    ]
