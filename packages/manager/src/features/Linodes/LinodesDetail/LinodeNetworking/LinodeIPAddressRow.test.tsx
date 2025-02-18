import { fireEvent } from '@testing-library/react';
import * as React from 'react';

import { linodeIPFactory } from 'src/factories/linodes';
import { ipResponseToDisplayRows } from 'src/features/Linodes/LinodesDetail/LinodeNetworking/LinodeIPAddresses';
import { PUBLIC_IPS_UNASSIGNED_TOOLTIP_TEXT } from 'src/features/Linodes/PublicIpsUnassignedTooltip';
import { renderWithTheme, wrapWithTableBody } from 'src/utilities/testHelpers';

import { IPAddressRowHandlers, LinodeIPAddressRow } from './LinodeIPAddressRow';

const ips = linodeIPFactory.build();
const ipDisplay = ipResponseToDisplayRows(ips)[0];

const handlers: IPAddressRowHandlers = {
  handleOpenEditRDNS: vi.fn(),
  handleOpenEditRDNSForRange: vi.fn(),
  handleOpenIPV6Details: vi.fn(),
  openRemoveIPDialog: vi.fn(),
  openRemoveIPRangeDialog: vi.fn(),
};

describe('LinodeIPAddressRow', () => {
  it('should render a Linode IP Address row', () => {
    const { getAllByText } = renderWithTheme(
      wrapWithTableBody(
        <LinodeIPAddressRow
          isVPCOnlyLinode={false}
          linodeId={1}
          readOnly={false}
          {...handlers}
          {...ipDisplay}
        />
      )
    );

    getAllByText(ipDisplay.address);
    getAllByText(ipDisplay.type);
    getAllByText(ipDisplay.gateway);
    getAllByText(ipDisplay.subnetMask);
    getAllByText(ipDisplay.rdns);
    // Check if actions were rendered
    getAllByText('Delete');
    getAllByText('Edit RDNS');
  });

  it('should disable the row if disabled is true and display a tooltip', async () => {
    const { findByRole, getByTestId } = renderWithTheme(
      wrapWithTableBody(
        <LinodeIPAddressRow
          isVPCOnlyLinode={true}
          linodeId={1}
          readOnly={false}
          {...handlers}
          {...ipDisplay}
        />
      )
    );

    const deleteBtn = getByTestId('action-menu-item-delete');
    expect(deleteBtn).toHaveAttribute('aria-disabled', 'true');
    fireEvent.mouseEnter(deleteBtn);
    const publicIpsUnassignedTooltip = await findByRole(/tooltip/);
    expect(publicIpsUnassignedTooltip).toContainHTML(
      PUBLIC_IPS_UNASSIGNED_TOOLTIP_TEXT
    );

    const editRDNSBtn = getByTestId('action-menu-item-edit-rdns');
    expect(editRDNSBtn).toHaveAttribute('aria-disabled', 'true');

    fireEvent.mouseEnter(editRDNSBtn);
    const publicIpsUnassignedTooltip2 = await findByRole(/tooltip/);
    expect(publicIpsUnassignedTooltip2).toContainHTML(
      PUBLIC_IPS_UNASSIGNED_TOOLTIP_TEXT
    );
  });

  it('should not disable the row if disabled is false', () => {
    const { getAllByRole } = renderWithTheme(
      wrapWithTableBody(
        <LinodeIPAddressRow
          isVPCOnlyLinode={false}
          linodeId={1}
          readOnly={false}
          {...handlers}
          {...ipDisplay}
        />
      )
    );

    const buttons = getAllByRole('button');

    const deleteBtn = buttons[1];
    expect(deleteBtn).not.toHaveAttribute('aria-disabled', 'true');

    const editRDNSBtn = buttons[3];
    expect(editRDNSBtn).not.toHaveAttribute('aria-disabled', 'true');
  });
});
