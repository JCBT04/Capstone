from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    initial = False

    dependencies = [
        ('guardian', '0002_add_is_authorized'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='GuardianApproval',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('allowed', 'Allowed'), ('declined', 'Declined')], max_length=20)),
                ('reason', models.TextField(blank=True, null=True)),
                ('source', models.CharField(blank=True, help_text='Source of action (mobile/admin)', max_length=50, null=True)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('acted_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='guardian_actions', to=settings.AUTH_USER_MODEL)),
                ('guardian', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='approvals', to='guardian.guardian')),
            ],
            options={
                'ordering': ['-timestamp'],
                'verbose_name': 'Guardian Approval',
                'verbose_name_plural': 'Guardian Approvals',
            },
        ),
    ]
