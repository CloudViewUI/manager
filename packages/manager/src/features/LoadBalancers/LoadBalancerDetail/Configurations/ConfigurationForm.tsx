import {
  CreateConfigurationSchema,
  UpdateConfigurationSchema,
} from '@linode/validation';
import { useFormik, yupToFormErrors } from 'formik';
import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { Autocomplete } from 'src/components/Autocomplete/Autocomplete';
import { Box } from 'src/components/Box';
import { Button } from 'src/components/Button/Button';
import { Divider } from 'src/components/Divider';
import { InputLabel } from 'src/components/InputLabel';
import { Notice } from 'src/components/Notice/Notice';
import { Stack } from 'src/components/Stack';
import { TextField } from 'src/components/TextField';
import { TooltipIcon } from 'src/components/TooltipIcon';
import { Typography } from 'src/components/Typography';
import {
  useLoadBalancerConfigurationCreateMutation,
  useLoadBalancerConfigurationMutation,
} from 'src/queries/aglb/configurations';
import { getFormikErrorsFromAPIErrors } from 'src/utilities/formikErrorUtils';

import { AddRouteDrawer } from '../Routes/AddRouteDrawer';
import { RoutesTable } from '../Routes/RoutesTable';
import { AddCertificateDrawer } from './AddCertificateDrawer';
import { CertificateTable } from './CertificateTable';
import { DeleteConfigurationDialog } from './DeleteConfigurationDialog';
import {
  CONFIGURATION_COPY,
  getConfigurationPayloadFromConfiguration,
  initialValues,
  protocolOptions,
} from './constants';

import type {
  CertificateConfig,
  Configuration,
  ConfigurationPayload,
  Protocol,
} from '@linode/api-v4';

interface EditProps {
  configuration: Configuration;
  mode: 'edit';
  onCancel?: never;
  onSuccess?: never;
}

interface CreateProps {
  configuration?: never;
  mode: 'create';
  onCancel: () => void;
  onSuccess: (configuration: Configuration) => void;
}

export const ConfigurationForm = (props: CreateProps | EditProps) => {
  const { configuration, mode, onCancel, onSuccess } = props;

  const { loadbalancerId: _loadbalancerId } = useParams<{
    loadbalancerId: string;
  }>();

  const [isAddCertDrawerOpen, setIsAddCertDrawerOpen] = useState(false);
  const [isAddRouteDrawerOpen, setIsAddRouteDrawerOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [hasChangedPort, setHasChangedPort] = useState(false);

  const [routesTableQuery, setRoutesTableQuery] = useState('');

  const loadbalancerId = Number(_loadbalancerId);

  const routesTableFilter = routesTableQuery
    ? { label: { '+contains': routesTableQuery } }
    : {};

  const useMutation =
    mode === 'edit'
      ? useLoadBalancerConfigurationMutation
      : useLoadBalancerConfigurationCreateMutation;

  const { error, isLoading, mutateAsync, reset } = useMutation(
    loadbalancerId,
    configuration?.id ?? -1
  );

  const formValues = useMemo(() => {
    if (mode === 'edit') {
      return getConfigurationPayloadFromConfiguration(configuration);
    }
    return initialValues;
  }, [configuration, mode]);

  const validationSchema =
    mode === 'create' ? CreateConfigurationSchema : UpdateConfigurationSchema;

  const formik = useFormik<ConfigurationPayload>({
    enableReinitialize: true,
    initialValues: formValues,
    async onSubmit(values, helpers) {
      try {
        const configuration = await mutateAsync(values);
        if (onSuccess) {
          onSuccess(configuration);
        }
      } catch (error) {
        helpers.setErrors(getFormikErrorsFromAPIErrors(error));
      }
    },
    validate(values) {
      // We must use `validate` insted of validationSchema because Formik decided to convert
      // "" to undefined before passing the values to yup. This makes it hard to validate `label`.
      // See https://github.com/jaredpalmer/formik/issues/805
      try {
        validationSchema.validateSync(values, { abortEarly: false });
        return {};
      } catch (error) {
        return yupToFormErrors(error);
      }
    },
    // Prevent errors from being cleared when we show API errors
    validateOnBlur: !error,
    validateOnChange: !error,
  });

  const handleRemoveCert = (index: number) => {
    formik.setFieldTouched('certificates');
    const newCerts = [...formik.values.certificates];
    newCerts.splice(index, 1);
    formik.setFieldValue('certificates', newCerts);
  };

  const handleRemoveRoute = (index: number) => {
    if (!formik.values.route_ids) {
      return;
    }
    const newRouteIds = [...formik.values.route_ids];
    newRouteIds.splice(index, 1);
    formik.setFieldValue('route_ids', newRouteIds);
  };

  const handleAddCerts = (certificate: CertificateConfig) => {
    formik.setFieldTouched('certificates');
    formik.setFieldValue('certificates', [
      ...formik.values.certificates,
      certificate,
    ]);
  };

  const handleReset = () => {
    formik.resetForm();
    setHasChangedPort(false);
    reset();
  };

  const handleProtocolChange = (protocol: Protocol) => {
    // If the user has changed the port manually, just update the protocol and NOT the port.
    if (hasChangedPort) {
      return formik.setFieldValue('protocol', protocol);
    }

    let newPort = formik.values.port;

    if (protocol === 'http') {
      newPort = 80;
    }

    if (protocol === 'https') {
      newPort = 443;
    }

    // Update the protocol and port at the same time if the port is unchanged.
    formik.setFormikState((prev) => ({
      ...prev,
      values: {
        ...prev.values,
        port: newPort,
        protocol,
      },
    }));
  };

  const generalErrors = error?.reduce((acc, { field, reason }) => {
    if (
      !field ||
      (formik.values.protocol !== 'https' && field.startsWith('certificates'))
    ) {
      return acc ? `${acc}, ${reason}` : reason;
    }
    return acc;
  }, '');

  return (
    <form onSubmit={formik.handleSubmit}>
      <Typography variant="h2">Details</Typography>
      {generalErrors && (
        <Notice
          spacingBottom={0}
          spacingTop={8}
          text={generalErrors}
          variant="error"
        />
      )}
      <TextField
        errorText={formik.touched.label ? formik.errors.label : undefined}
        label="Configuration Label"
        name="label"
        onBlur={formik.handleBlur}
        onChange={formik.handleChange}
        value={formik.values.label}
      />
      <Stack spacing={2}>
        <Stack direction="row" spacing={2}>
          <Autocomplete
            onChange={(e, { value }) => {
              handleProtocolChange(value);
            }}
            textFieldProps={{
              labelTooltipText: CONFIGURATION_COPY.Protocol,
            }}
            value={protocolOptions.find(
              (option) => option.value === formik.values.protocol
            )}
            disableClearable
            errorText={formik.errors.protocol}
            label="Protocol"
            options={protocolOptions}
          />
          <TextField
            onChange={(e) => {
              formik.handleChange(e);
              setHasChangedPort(true);
            }}
            errorText={formik.touched.port ? formik.errors.port : undefined}
            label="Port"
            labelTooltipText={CONFIGURATION_COPY.Port}
            name="port"
            onBlur={formik.handleBlur}
            type="number"
            value={formik.values.port}
          />
        </Stack>
        {formik.values.protocol === 'https' && (
          <Stack maxWidth="600px">
            <Stack alignItems="center" direction="row">
              <InputLabel sx={{ marginBottom: 0 }}>TLS Certificates</InputLabel>
              <TooltipIcon
                status="help"
                text={CONFIGURATION_COPY.Certificates}
              />
            </Stack>
            {formik.touched.certificates &&
              typeof formik.errors.certificates === 'string' && (
                <Notice
                  spacingBottom={16}
                  spacingTop={0}
                  text={formik.errors.certificates}
                  variant="error"
                />
              )}
            <CertificateTable
              errors={
                Array.isArray(formik.errors.certificates)
                  ? formik.errors.certificates
                  : []
              }
              certificates={formik.values.certificates}
              loadbalancerId={loadbalancerId}
              onRemove={handleRemoveCert}
            />
            <Box mt={2}>
              <Button
                buttonType="outlined"
                onClick={() => setIsAddCertDrawerOpen(true)}
              >
                Add Certificate
              </Button>
            </Box>
          </Stack>
        )}
      </Stack>
      <Divider spacingBottom={16} spacingTop={16} />
      <Stack spacing={2}>
        <Typography variant="h2">Routes</Typography>
        {formik.errors.route_ids && (
          <Notice text={formik.errors.route_ids} variant="error" />
        )}
        <Stack direction="row" flexWrap="wrap" gap={2}>
          <Button
            buttonType="outlined"
            onClick={() => setIsAddRouteDrawerOpen(true)}
          >
            Add Route
          </Button>
          <TextField
            hideLabel
            label={`Filter ${formik.values.label}'s Routes`}
            onChange={(e) => setRoutesTableQuery(e.target.value)}
            placeholder="Filter"
          />
        </Stack>
        <RoutesTable
          configuredRouteIds={formik.values.route_ids ?? []}
          filter={routesTableFilter}
          onRemove={handleRemoveRoute}
        />
      </Stack>
      <Divider spacingBottom={16} spacingTop={16} />
      <Stack direction="row" flexWrap="wrap" gap={2} justifyContent="flex-end">
        {mode === 'edit' && formik.dirty && (
          <Button buttonType="secondary" onClick={handleReset}>
            Reset
          </Button>
        )}
        {mode === 'edit' && (
          <Button
            buttonType="secondary"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            Delete
          </Button>
        )}
        {mode === 'create' && (
          <Button buttonType="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          buttonType="primary"
          disabled={mode === 'edit' && !formik.dirty}
          loading={isLoading}
          type="submit"
        >
          {mode == 'edit' ? 'Save' : 'Create'} Configuration
        </Button>
      </Stack>
      <AddRouteDrawer
        onAdd={(route) => {
          formik.setFieldValue('route_ids', [
            ...(formik.values.route_ids ?? []),
            route,
          ]);
        }}
        configuration={formik.values}
        loadbalancerId={loadbalancerId}
        onClose={() => setIsAddRouteDrawerOpen(false)}
        open={isAddRouteDrawerOpen}
      />
      <AddCertificateDrawer
        loadbalancerId={loadbalancerId}
        onAdd={handleAddCerts}
        onClose={() => setIsAddCertDrawerOpen(false)}
        open={isAddCertDrawerOpen}
      />
      {mode === 'edit' && (
        <DeleteConfigurationDialog
          configuration={configuration}
          loadbalancerId={loadbalancerId}
          onClose={() => setIsDeleteDialogOpen(false)}
          open={isDeleteDialogOpen}
        />
      )}
    </form>
  );
};
